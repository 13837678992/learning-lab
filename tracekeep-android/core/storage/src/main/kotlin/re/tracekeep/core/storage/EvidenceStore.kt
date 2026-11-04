package re.tracekeep.core.storage

import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardOpenOption
import java.util.UUID
import kotlin.io.path.exists
import kotlin.io.path.isDirectory
import kotlin.io.path.readText
import kotlin.streams.asSequence
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import re.tracekeep.core.crypto.SealCanonicalEncoder
import re.tracekeep.core.crypto.SignatureEngine
import re.tracekeep.core.crypto.SigningException
import re.tracekeep.core.integrity.HashChain
import re.tracekeep.core.integrity.Sha256
import re.tracekeep.core.model.EvidenceEvent
import re.tracekeep.core.model.EvidenceFile
import re.tracekeep.core.model.EvidenceJson
import re.tracekeep.core.model.EvidenceLocation
import re.tracekeep.core.model.EvidenceSession
import re.tracekeep.core.model.EventSource
import re.tracekeep.core.model.EventTypes
import re.tracekeep.core.model.FileLifecycle
import re.tracekeep.core.model.FileRegistry
import re.tracekeep.core.model.FileRole
import re.tracekeep.core.model.IllegalSessionTransitionException
import re.tracekeep.core.model.RecordingType
import re.tracekeep.core.model.SaveStatus
import re.tracekeep.core.model.SealFileEntry
import re.tracekeep.core.model.SealRecord
import re.tracekeep.core.model.SignatureRecord
import re.tracekeep.core.model.SessionState
import re.tracekeep.core.model.SystemTimeProvider
import re.tracekeep.core.model.TimeProvider
import re.tracekeep.core.model.VerificationStatus
import re.tracekeep.core.location.TimeJumpDetector

/**
 * 本地证据存储核心（阶段 2；需求 §5「原始媒体与存储」）。
 *
 * 目录结构（根目录由调用方传入，Android 端应传应用私有目录）：
 * ```
 * <root>/sessions/<sessionId>/
 *     session.json     会话元数据（状态机；原子替换写入）
 *     files.json       文件登记表（原子替换写入）
 *     events.log       追加式事件日志（JSON Lines；封存前只追加）
 *     locations.jsonl  追加式定位记录（JSON Lines）
 *     seal.json        封存记录（封存后生成）
 *     media/           原始媒体（FileRole.ORIGINAL；只创建、追加写入，永不改写）
 *     derived/         处理副本（FileRole.DERIVED；与原始分开保存）
 * ```
 *
 * 硬性规则（与需求/威胁模型对应）：
 * - 封存后的会话拒绝一切写入（[SessionSealedException]），材料不可变；
 * - 事件日志只追加；读取时遇到无法解析的行**跳过并计数**，绝不改写或修复原文件；
 * - 校验失败不覆盖、不自动修复；[verifyFile] 只返回状态；
 * - **哈希只用于比较字节是否一致**，不是可信时间证明（见 docs/THREAT_MODEL.md）。
 *
 * 已知限制（如实披露，勿夸大）：
 * - 单进程所有权模型：不提供跨进程/多实例并发写的文件锁；UI 层保证单实例访问；
 * - 目录 fsync 为尽力而为，极端断电场景的持久性受文件系统语义限制；
 * - 设备被完全控制（Root/恶意软件）时账本可被整体重建（THREAT_MODEL F-2 残余风险）。
 */
class EvidenceStore(
    private val root: Path,
    private val time: TimeProvider = SystemTimeProvider,
) {

    private data class OpenState(
        var nextEventSeq: Long,
        var nextLocationSeq: Long,
        /** 链尾哈希（末条已入链事件的 hash）；null 表示尚无入链事件（下一条为创世）。 */
        var lastEventHash: String?,
    )

    private val openStates = mutableMapOf<String, OpenState>()

    /** 时间源基线（每会话一条；见 [maybeRecordTimeAnomaly]）。 */
    private val timeBaselines = mutableMapOf<String, TimeJumpDetector.Sample>()

    // ---------------------------------------------------------------- 会话

    fun createSession(
        recordingType: RecordingType,
        deviceSummary: Map<String, String> = emptyMap(),
    ): EvidenceSession {
        val sessionId = UUID.randomUUID().toString()
        PathSafety.requireSafeSessionId(sessionId)
        val dir = sessionDir(sessionId)
        Files.createDirectories(dir.resolve(DIR_MEDIA))
        Files.createDirectories(dir.resolve(DIR_DERIVED))

        val session = EvidenceSession(
            sessionId = sessionId,
            recordingType = recordingType,
            state = SessionState.CREATED,
            createdAtWallMs = time.wallMs(),
            createdAtMonoMs = time.monoMs(),
            deviceSummary = deviceSummary,
        )
        writeSession(session)
        appendEvent(sessionId, EventTypes.SESSION_CREATED, EventSource.USER_ACTION)
        return session
    }

    fun loadSession(sessionId: String): EvidenceSession {
        PathSafety.requireSafeSessionId(sessionId)
        val file = sessionDir(sessionId).resolve(FILE_SESSION)
        if (!file.exists()) throw StorageException("Session not found: $sessionId")
        return try {
            EvidenceJson.instance.decodeFromString(file.readText())
        } catch (e: Exception) {
            throw StorageCorruptException("Unreadable session.json for $sessionId", e)
        }
    }

    fun listSessionIds(): List<String> =
        sessionsRoot().takeIf { it.isDirectory() }?.let { rootDir ->
            Files.list(rootDir).asSequence()
                .filter { it.isDirectory() }
                .map { it.fileName.toString() }
                .sorted()
                .toList()
        } ?: emptyList()

    /**
     * 普通状态迁移（SEALED 除外——只能经 [seal] 进入）。
     * 同时写入对应事件。进入 STOPPED 时记录 [EvidenceSession.stoppedAtWallMs]。
     * 封存后调用抛 [SessionSealedException]。
     */
    fun transition(sessionId: String, target: SessionState): EvidenceSession {
        if (target == SessionState.SEALED) {
            throw StorageException("SEALED can only be reached via seal()")
        }
        val session = requireNotSealed(sessionId)
        if (!session.state.canTransitionTo(target)) {
            throw IllegalSessionTransitionException(session.state, target)
        }
        val eventType = when (target) {
            SessionState.RECORDING ->
                if (session.state == SessionState.PAUSED) EventTypes.SESSION_RESUMED else EventTypes.SESSION_STARTED
            SessionState.PAUSED -> EventTypes.SESSION_PAUSED
            SessionState.STOPPED -> EventTypes.SESSION_STOPPED
            SessionState.ABORTED -> EventTypes.SESSION_ABORTED
            else -> throw IllegalSessionTransitionException(session.state, target)
        }
        val updated = session.copy(
            state = target,
            // 停止（封装完成）时间：仅进入 STOPPED 时记录一次
            stoppedAtWallMs = if (target == SessionState.STOPPED) {
                session.stoppedAtWallMs ?: time.wallMs()
            } else {
                session.stoppedAtWallMs
            },
        )
        writeSession(updated)
        appendEvent(sessionId, eventType, EventSource.USER_ACTION)
        return updated
    }

    // ---------------------------------------------------------------- 本地保存（停止即保存）

    /**
     * 完成"停止并保存"流程的持久化部分（v0.1.2 专项：停止后直接保存到本地证据库）。
     *
     * 前置：会话处于 STOPPED（引擎已停止且容器封装完成）、主文件已 FINALIZED。
     * 执行（**多输出会话**：全部 ORIGINAL 文件逐一处理）：
     * 1. 主文件（[fileId]）必须 FINALIZED；所有**已封装**的次级输出必须完整性校验 PASS
     *    （任一 FAIL/MISSING/UNREADABLE → 整次保存失败，防止部分材料异常被掩盖）；
     * 2. 主文件非空校验（0 字节媒体不是有效保存对象）；
     * 3. 追加 [EventTypes.RECORDING_SAVED] 事件（含主文件哈希/大小/时间 + 未完成文件清单）；
     * 4. 会话写入 [SaveStatus.SAVED] + savedAtWallMs（原子替换写入）。
     *
     * 未封装成功的次级输出（如录屏的内部音频轨）不阻止保存成功，但必须如实披露：
     * 返回 [SaveOutcome.Saved.incompleteFileIds]，界面/报告不得将其描述为已保存。
     *
     * 幂等性：已 SAVED 的会话重复调用直接返回原结果，不重复追加事件——
     * 用户快速重复点击停止、崩溃后的恢复重试均不会产生重复保存记录。
     *
     * 失败处理（任一环节）：
     * - **不删除、不改写录制文件**（保留供恢复/复核）；
     * - 会话写入 [SaveStatus.FAILED] + [EvidenceSession.saveErrorReason]；
     * - 追加 [EventTypes.RECORDING_SAVE_FAILED] 事件；
     * - 返回 [SaveOutcome.Failed]——调用方不得显示"保存成功"。
     *
     * 能力边界：SAVED 仅表示"文件已存入本地证据库且记录已持久化"，
     * 不代表内容真实、来源真实或任何法律效力（见 docs/THREAT_MODEL.md）。
     */
    fun completeRecordingSave(sessionId: String, fileId: String): SaveOutcome {
        val session: EvidenceSession = try {
            loadSession(sessionId)
        } catch (e: StorageException) {
            return SaveOutcome.Failed(null, "session unreadable: ${e.message}")
        }

        val registry = try {
            readRegistry(sessionId)
        } catch (e: StorageException) {
            return failSave(session, null, "registry unreadable: ${e.message}")
        }
        val record = registry.files.firstOrNull { it.fileId == fileId }
            ?: return failSave(session, null, "file not registered: $fileId")

        // 幂等：已保存直接返回既有结果（不追加事件）
        if (session.saveStatus == SaveStatus.SAVED && session.savedAtWallMs != null) {
            val incomplete = registry.files
                .filter { it.lifecycle != FileLifecycle.FINALIZED }
                .map { it.fileId }
            return SaveOutcome.Saved(session, record, incomplete)
        }
        if (session.state != SessionState.STOPPED) {
            return failSave(session, record, "session state is ${session.state}, expected STOPPED")
        }
        if (record.lifecycle != FileLifecycle.FINALIZED || record.sha256 == null) {
            return failSave(session, record, "file not finalized")
        }

        // 1) 完整性校验：主文件 + 全部已封装次级输出逐一重算（任一异常 → 整次保存失败）
        for (f in registry.files.filter { it.lifecycle == FileLifecycle.FINALIZED }) {
            when (val verification = verifyRecord(sessionId, f)) {
                VerificationStatus.PASS -> Unit
                else -> return failSave(
                    session, record,
                    "integrity check failed for ${f.relativePath}: $verification",
                )
            }
        }
        // 2) 主文件非空校验
        if ((record.sizeBytes ?: 0L) <= 0L) {
            return failSave(session, record, "file is empty (0 bytes)")
        }
        val incompleteIds = registry.files
            .filter { it.lifecycle != FileLifecycle.FINALIZED }
            .map { it.fileId }

        // 3) 保存事件（崩溃重试场景下避免重复追加）+ 4) 会话持久化
        return try {
            val savedAt = time.wallMs()
            val alreadyRecorded = readEvents(sessionId).events.any {
                it.type == EventTypes.RECORDING_SAVED && it.payload["fileId"]?.toString()?.contains(fileId) == true
            }
            if (!alreadyRecorded) {
                appendEvent(
                    sessionId,
                    EventTypes.RECORDING_SAVED,
                    EventSource.APP_OBSERVATION,
                    payload = JsonObject(
                        buildMap {
                            put("fileId", JsonPrimitive(fileId))
                            put("relativePath", JsonPrimitive(record.relativePath))
                            record.sha256?.let { put("sha256", JsonPrimitive(it)) }
                            record.sizeBytes?.let { put("sizeBytes", JsonPrimitive(it)) }
                            put("savedAtWallMs", JsonPrimitive(savedAt))
                            put("outputCount", JsonPrimitive(registry.files.size))
                            put("incompleteFileIds", JsonPrimitive(incompleteIds.joinToString(",")))
                        },
                    ),
                )
            }
            val saved = session.copy(
                saveStatus = SaveStatus.SAVED,
                savedAtWallMs = savedAt,
                saveErrorReason = null,
            )
            writeSession(saved)
            SaveOutcome.Saved(saved, record, incompleteIds)
        } catch (e: Exception) {
            failSave(session, record, "persist failed: ${e.message ?: e::class.simpleName}")
        }
    }

    private fun failSave(
        session: EvidenceSession,
        record: EvidenceFile?,
        reason: String,
    ): SaveOutcome.Failed {
        runCatching {
            appendEvent(
                session.sessionId,
                EventTypes.RECORDING_SAVE_FAILED,
                EventSource.APP_OBSERVATION,
                payload = JsonObject(
                    buildMap {
                        record?.let { put("fileId", JsonPrimitive(it.fileId)) }
                        put("reason", JsonPrimitive(reason))
                    },
                ),
            )
        }
        val failed = session.copy(
            saveStatus = SaveStatus.FAILED,
            saveErrorReason = reason,
            savedAtWallMs = null,
        )
        runCatching { writeSession(failed) }
        return SaveOutcome.Failed(failed, reason)
    }

    /**
     * 启动恢复（保存侧）：对"已停止但未保存"（STOPPED + saveStatus==null）的会话
     * 重试完整保存流程——覆盖"保存过程中进程退出"的场景（文件保留、记录可补写）。
     * 对已 SAVED 或 FAILED 的会话不重复处理（FAILED 保持失败状态与原因，供用户复核）。
     */
    fun recoverPendingSaves(): List<SaveRecoveryRecord> {
        val results = mutableListOf<SaveRecoveryRecord>()
        for (sessionId in listSessionIds()) {
            val session = try {
                loadSession(sessionId)
            } catch (_: StorageException) {
                continue
            }
            if (session.state != SessionState.STOPPED || session.saveStatus != null) continue
            val fileId = try {
                readRegistry(sessionId).files.firstOrNull()?.fileId
            } catch (_: StorageException) {
                null
            } ?: continue
            runCatching {
                appendEvent(
                    sessionId,
                    EventTypes.RECOVERY_OBSERVED,
                    EventSource.APP_OBSERVATION,
                    payload = JsonObject(mapOf("observedState" to JsonPrimitive("STOPPED_UNSAVED"))),
                )
            }
            val outcome = completeRecordingSave(sessionId, fileId)
            results.add(SaveRecoveryRecord(sessionId, outcome is SaveOutcome.Saved))
        }
        return results
    }

    // ---------------------------------------------------------------- 文件

    /**
     * 登记一个新证据文件。返回句柄（含可写入的绝对路径）。
     * 调用方（录制层）负责向 [RegisteredFile.absolutePath] 写入实际字节；
     * 完成后必须调用 [finalizeFile]（或 [markFileIncomplete]）。
     */
    fun registerFile(
        sessionId: String,
        role: FileRole,
        fileName: String,
        derivedFromFileId: String? = null,
    ): RegisteredFile {
        val session = requireNotSealed(sessionId)
        requireSafeFileName(fileName)

        val registry = readRegistry(sessionId)
        when (role) {
            FileRole.ORIGINAL -> {
                require(derivedFromFileId == null) { "ORIGINAL file must not have derivedFromFileId" }
            }
            FileRole.DERIVED -> {
                requireNotNull(derivedFromFileId) { "DERIVED file must reference a source file" }
                val source = registry.files.firstOrNull { it.fileId == derivedFromFileId }
                    ?: throw StorageException("Derived source not found: $derivedFromFileId")
                require(source.role == FileRole.ORIGINAL) { "Derived source must be ORIGINAL" }
            }
        }

        val fileId = UUID.randomUUID().toString()
        val dirName = when (role) {
            FileRole.ORIGINAL -> DIR_MEDIA
            FileRole.DERIVED -> DIR_DERIVED
        }
        val relativePath = "$dirName/$fileId-$fileName"
        val absolute = PathSafety.resolveInside(sessionDir(sessionId), Paths.get(relativePath))
        try {
            Files.newByteChannel(
                absolute,
                StandardOpenOption.CREATE_NEW,
                StandardOpenOption.WRITE,
            ).close()
        } catch (e: IOException) {
            throw StorageException("Cannot create evidence file: $relativePath", e)
        }

        val record = EvidenceFile(
            fileId = fileId,
            sessionId = session.sessionId,
            relativePath = relativePath,
            role = role,
            derivedFromFileId = derivedFromFileId,
            lifecycle = FileLifecycle.REGISTERED,
            createdWallMs = time.wallMs(),
        )
        writeRegistry(sessionId, registry.copy(files = registry.files + record))
        appendEvent(
            sessionId, EventTypes.FILE_REGISTERED, EventSource.APP_OBSERVATION,
            payload = filePayload(record),
        )
        return RegisteredFile(fileId = fileId, relativePath = relativePath, absolutePath = absolute)
    }

    /** 封装完成：对文件实际字节流计算 SHA-256 与大小，登记为 FINALIZED。 */
    fun finalizeFile(sessionId: String, fileId: String): EvidenceFile {
        requireNotSealed(sessionId)
        val registry = readRegistry(sessionId)
        val record = requireFile(registry, fileId)
        if (record.lifecycle == FileLifecycle.FINALIZED) return record

        val absolute = PathSafety.resolveInside(sessionDir(sessionId), Paths.get(record.relativePath))
        if (!absolute.exists()) throw StorageException("File missing on finalize: ${record.relativePath}")

        val finalized = try {
            val size = Files.size(absolute)
            val digest = absolute.toFile().inputStream().buffered().use { Sha256.of(it) }
            record.copy(
                lifecycle = FileLifecycle.FINALIZED,
                sizeBytes = size,
                sha256 = digest,
                finalizedWallMs = time.wallMs(),
                note = null,
            )
        } catch (e: IOException) {
            throw StorageException("Cannot finalize file: ${record.relativePath}", e)
        }
        writeRegistry(sessionId, registry.copy(files = registry.files.replace(finalized)))
        appendEvent(
            sessionId, EventTypes.FILE_FINALIZED, EventSource.APP_OBSERVATION,
            payload = filePayload(finalized),
        )
        return finalized
    }

    /** 标记文件未完成（封装失败/被中断）。未完成文件不得标记为完整封存。 */
    fun markFileIncomplete(sessionId: String, fileId: String, note: String): EvidenceFile {
        requireNotSealed(sessionId)
        val registry = readRegistry(sessionId)
        val record = requireFile(registry, fileId)
        val incomplete = record.copy(lifecycle = FileLifecycle.INCOMPLETE, sha256 = null, note = note)
        writeRegistry(sessionId, registry.copy(files = registry.files.replace(incomplete)))
        appendEvent(
            sessionId, EventTypes.FILE_INCOMPLETE, EventSource.APP_OBSERVATION,
            payload = filePayload(incomplete),
        )
        return incomplete
    }

    fun listFiles(sessionId: String): List<EvidenceFile> = readRegistry(sessionId).files

    /**
     * 重新读取文件并重算 SHA-256，与登记值比较。**只读操作**：不覆盖、不修复。
     * 状态区分：PASS / FAIL / MISSING / UNFINISHED（未封装）/ UNREADABLE。
     */
    fun verifyFile(sessionId: String, fileId: String): VerificationStatus {
        val record = requireFile(readRegistry(sessionId), fileId)
        return verifyRecord(sessionId, record)
    }

    // ---------------------------------------------------------------- 事件与定位

    fun appendEvent(
        sessionId: String,
        type: String,
        source: EventSource,
        payload: JsonObject = JsonObject(emptyMap()),
    ): EvidenceEvent {
        requireNotSealed(sessionId)
        val wall = time.wallMs()
        val mono = time.monoMs()

        // 时间源一致性检查（需求 §4；阶段 6）：与本会话上一次采样的偏移比较，
        // 发现突变时**先**如实记录 TIME_ANOMALY_OBSERVED（现象分类，非原因断言），
        // 再写入原事件（不覆盖、不修改历史）。
        maybeRecordTimeAnomaly(sessionId, wall, mono)

        return appendChainedEvent(sessionId, wall, mono, type, source, payload)
    }

    /**
     * 构造并落盘一条**已入链**事件（阶段 7）：prevHash = 链尾（无则 GENESIS），
     * hash = SHA-256(规范编码(事件))。链尾状态在 [OpenState.lastEventHash] 维护。
     */
    private fun appendChainedEvent(
        sessionId: String,
        wallMs: Long,
        monoMs: Long,
        type: String,
        source: EventSource,
        payload: JsonObject,
    ): EvidenceEvent {
        val state = openState(sessionId)
        val seq = state.nextEventSeq
        state.nextEventSeq = seq + 1
        val prevHash = state.lastEventHash ?: HashChain.GENESIS_PREV_HASH
        val unsigned = EvidenceEvent(
            seq = seq,
            sessionId = sessionId,
            wallMs = wallMs,
            monoMs = monoMs,
            type = type,
            source = source,
            payload = payload,
            prevHash = prevHash,
        )
        val event = HashChain.withHash(unsigned)
        AtomicFiles.appendLine(
            sessionDir(sessionId).resolve(FILE_EVENTS),
            EvidenceJson.instance.encodeToString(event).toByteArray(Charsets.UTF_8),
        )
        state.lastEventHash = event.hash
        return event
    }

    /**
     * 比较本次采样与基线偏移，异常时追加 TIME_ANOMALY_OBSERVED 事件并更新基线。
     * 基线的建立/恢复：首次调用（或新 store 实例）时以 events.log 中最后一条可解析事件的
     * 双钟读数为基线——**重启后不误报**（若确因设备重启导致单调钟归零，会被如实分类为
     * MONOTONIC_RESET_SUSPECTED 而非"篡改"）。
     */
    private fun maybeRecordTimeAnomaly(sessionId: String, wallMs: Long, monoMs: Long) {
        val current = TimeJumpDetector.Sample(wallMs, monoMs)
        val baseline = timeBaseline(sessionId, current)
        val verdict = TimeJumpDetector.compare(baseline, current)
        if (verdict is TimeJumpDetector.Verdict.Anomaly) {
            // 异常事件同样入链（链覆盖全部事件，含应用自身观察记录）
            appendChainedEvent(
                sessionId = sessionId,
                wallMs = wallMs,
                monoMs = monoMs,
                type = EventTypes.TIME_ANOMALY_OBSERVED,
                source = EventSource.APP_OBSERVATION,
                payload = JsonObject(
                    mapOf(
                        "kind" to JsonPrimitive(verdict.kind.name),
                        "deltaMs" to JsonPrimitive(verdict.deltaMs),
                        "baselineOffsetMs" to JsonPrimitive(verdict.baselineOffsetMs),
                        "currentOffsetMs" to JsonPrimitive(verdict.currentOffsetMs),
                        "note" to JsonPrimitive("observed offset jump; kind is an observation, not a cause assertion"),
                    ),
                ),
            )
        }
    }

    /**
     * 取（并更新）该会话的时间基线。
     * 首次访问时从 events.log 末条可解析事件恢复（重启/新实例场景），否则用当前采样建立基线。
     */
    private fun timeBaseline(sessionId: String, current: TimeJumpDetector.Sample): TimeJumpDetector.Sample? {
        timeBaselines[sessionId]?.let { baseline ->
            timeBaselines[sessionId] = current
            return baseline
        }
        val lastEvent = readEvents(sessionId).events.lastOrNull()
        val baseline = lastEvent?.let { TimeJumpDetector.Sample(it.wallMs, it.monoMs) }
        timeBaselines[sessionId] = current
        return baseline
    }

    /** 读取事件日志；无法解析的行跳过并计数（绝不改写原文件）。 */
    fun readEvents(sessionId: String): EventLogReadResult {
        val file = sessionDir(sessionId).resolve(FILE_EVENTS)
        if (!file.exists()) return EventLogReadResult(emptyList(), 0)
        val events = mutableListOf<EvidenceEvent>()
        var skipped = 0L
        Files.newBufferedReader(file, Charsets.UTF_8).useLines { lines ->
            lines.forEach { line ->
                if (line.isBlank()) return@forEach
                val parsed = try {
                    EvidenceJson.instance.decodeFromString<EvidenceEvent>(line)
                } catch (_: Exception) {
                    null
                }
                if (parsed == null) skipped++ else events.add(parsed)
            }
        }
        return EventLogReadResult(events, skipped)
    }

    fun appendLocation(
        sessionId: String,
        latitude: Double,
        longitude: Double,
        accuracyMeters: Float? = null,
        provider: String? = null,
    ): EvidenceLocation {
        requireNotSealed(sessionId)
        val location = EvidenceLocation(
            seq = nextLocationSeq(sessionId),
            sessionId = sessionId,
            wallMs = time.wallMs(),
            monoMs = time.monoMs(),
            latitude = latitude,
            longitude = longitude,
            accuracyMeters = accuracyMeters,
            provider = provider,
        )
        AtomicFiles.appendLine(
            sessionDir(sessionId).resolve(FILE_LOCATIONS),
            EvidenceJson.instance.encodeToString(location).toByteArray(Charsets.UTF_8),
        )
        return location
    }

    fun readLocations(sessionId: String): LocationLogReadResult {
        val file = sessionDir(sessionId).resolve(FILE_LOCATIONS)
        if (!file.exists()) return LocationLogReadResult(emptyList(), 0)
        val locations = mutableListOf<EvidenceLocation>()
        var skipped = 0L
        Files.newBufferedReader(file, Charsets.UTF_8).useLines { lines ->
            lines.forEach { line ->
                if (line.isBlank()) return@forEach
                val parsed = try {
                    EvidenceJson.instance.decodeFromString<EvidenceLocation>(line)
                } catch (_: Exception) {
                    null
                }
                if (parsed == null) skipped++ else locations.add(parsed)
            }
        }
        return LocationLogReadResult(locations, skipped)
    }

    // ---------------------------------------------------------------- 封存

    /**
     * 封存会话（进入终态 SEALED）。
     * 前置：状态为 STOPPED（正常结束）或 ABORTED（中断保全）。
     * 行为：
     * 1. 仍未 FINALIZED 的登记文件先被如实标记为 INCOMPLETE（不伪造哈希）；
     * 2. 逐文件重算校验并写入 seal.json 快照（含 events/locations 原始字节摘要与跳过行数）；
     * 3. 会话状态写入 SEALED（其后一切写入被拒绝）。
     * 封存不等于「内容真实」或「法院采信」；能力边界见 docs/THREAT_MODEL.md。
     */
    fun seal(sessionId: String): SealResult {
        val session = requireNotSealed(sessionId)
        if (session.state != SessionState.STOPPED && session.state != SessionState.ABORTED) {
            throw StorageException(
                "Seal requires STOPPED or ABORTED state, current=${session.state}",
            )
        }

        // 1) 未封装文件如实标记 INCOMPLETE
        var registry = readRegistry(sessionId)
        for (record in registry.files.filter { it.lifecycle == FileLifecycle.REGISTERED }) {
            registry = registry.copy(
                files = registry.files.replace(
                    record.copy(
                        lifecycle = FileLifecycle.INCOMPLETE,
                        note = "still REGISTERED at seal time; marked incomplete",
                    ),
                ),
            )
        }
        writeRegistry(sessionId, registry)

        // 2) 事件日志（封存事件先写入，使摘要覆盖完整日志）
        if (readEvents(sessionId).events.none { it.type == EventTypes.SESSION_SEALED }) {
            appendEvent(sessionId, EventTypes.SESSION_SEALED, EventSource.USER_ACTION)
        }
        val eventsRead = readEvents(sessionId)
        val eventsFile = sessionDir(sessionId).resolve(FILE_EVENTS)
        val locationsRead = readLocations(sessionId)
        val locationsFile = sessionDir(sessionId).resolve(FILE_LOCATIONS)

        // 3) 逐文件校验快照
        val sealEntries = registry.files.map { record ->
            SealFileEntry(
                fileId = record.fileId,
                relativePath = record.relativePath,
                lifecycle = record.lifecycle,
                sha256 = record.sha256,
                sizeBytes = record.sizeBytes,
                verification = verifyRecord(sessionId, record),
            )
        }
        // 异常标志：中断封存 / 任一文件校验未通过 / 日志存在跳过行（如实披露，不得掩盖）
        val anomalies = session.state == SessionState.ABORTED ||
            sealEntries.any { it.verification != VerificationStatus.PASS } ||
            eventsRead.skippedLines > 0 || locationsRead.skippedLines > 0

        val sealRecord = SealRecord(
            sessionId = sessionId,
            sealedAtWallMs = time.wallMs(),
            sealedAtMonoMs = time.monoMs(),
            sealedFromState = session.state,
            sealedWithAnomalies = anomalies,
            files = sealEntries,
            eventsCount = eventsRead.events.size.toLong(),
            eventsSkippedLines = eventsRead.skippedLines,
            eventsSha256 = sha256OfFileOrEmpty(eventsFile),
            locationsCount = if (locationsFile.exists()) locationsRead.locations.size.toLong() else null,
            locationsSkippedLines = locationsRead.skippedLines,
            locationsSha256 = if (locationsFile.exists()) sha256OfFileOrEmpty(locationsFile) else null,
        )
        AtomicFiles.write(
            sessionDir(sessionId).resolve(FILE_SEAL),
            EvidenceJson.instance.encodeToString(sealRecord).toByteArray(Charsets.UTF_8),
        )

        // 4) 会话进入 SEALED
        writeSession(
            session.copy(
                state = SessionState.SEALED,
                sealedAtWallMs = sealRecord.sealedAtWallMs,
                sealedWithAnomalies = anomalies,
            ),
        )
        openStates.remove(sessionId)
        return SealResult(sealRecord)
    }

    fun loadSeal(sessionId: String): SealRecord {
        val file = sessionDir(sessionId).resolve(FILE_SEAL)
        if (!file.exists()) throw StorageException("Session not sealed: $sessionId")
        return try {
            EvidenceJson.instance.decodeFromString(file.readText())
        } catch (e: Exception) {
            throw StorageCorruptException("Unreadable seal.json for $sessionId", e)
        }
    }

    // ---------------------------------------------------------------- 签名（阶段 7）

    /**
     * 封存 + 签名（需求 §5：对链头/最终清单签名；阶段 7）。
     *
     * 流程：先 [seal]（生成 seal.json，链上写入 session_sealed 事件），
     * 再以「链尾哈希 + 事件数 + 文件清单摘要 + 算法/版本/密钥标识」构造签名载荷，
     * 规范编码后交 [SignatureEngine] 签名，落盘 signatures.json。
     *
     * 签名失败（引擎异常，如密钥丢失）：**抛 [SigningException]**——调用方不得
     * 把未签名的会话标记为"已签名"；seal.json 已生成（封存本身成功），
     * 签名可另行重试（见 [loadSignatureRecord] 判空）。
     *
     * 私钥永不进入本方法返回的结构或任何落盘文件（仅公钥/签名值进入 signatures.json）。
     */
    fun sealSigned(sessionId: String, engine: SignatureEngine, appVersionName: String? = null): SealResult {
        // 已封存的会话不重复封存（seal() 只接受 STOPPED/ABORTED）——直接在其上补签名
        val sealResult = if (loadSession(sessionId).state == SessionState.SEALED) {
            SealResult(loadSeal(sessionId))
        } else {
            seal(sessionId)
        }
        val sealRecord = sealResult.record

        val events = readEvents(sessionId).events
        val chain = HashChain.verify(events)
        val chainHeadHash = events.lastOrNull { it.hash != null }?.hash
        val filesDigest = readRegistry(sessionId).files
            .filter { it.sha256 != null }
            .associate { it.relativePath to it.sha256!! }

        val descriptor = engine.getOrCreateActiveKey(appVersionName)
        val payload = SealCanonicalEncoder.SigningPayload(
            chainHeadHash = chainHeadHash,
            eventsCount = chain.chainedCount,
            files = filesDigest,
            appVersionName = appVersionName ?: "unknown",
            algorithm = descriptor.algorithm,
            keyId = descriptor.keyId,
        )
        val payloadBytes = SealCanonicalEncoder.encode(payload)
        val signatureBase64 = try {
            engine.sign(descriptor.keyId, payloadBytes, descriptor.algorithm)
        } catch (e: SigningException) {
            throw e
        } catch (e: Exception) {
            throw SigningException("seal signing failed: ${e.message ?: e::class.simpleName}", e)
        }
        val record = SignatureRecord(
            objectType = SealCanonicalEncoder.SEAL_OBJECT_TYPE,
            objectVersion = SealCanonicalEncoder.SEAL_OBJECT_VERSION,
            algorithm = descriptor.algorithm,
            keyId = descriptor.keyId,
            signedPayloadSha256 = Sha256.of(payloadBytes),
            signatureBase64 = signatureBase64,
            signedAtWallMs = time.wallMs(),
            signedPayload = payload.toJson(),
        )
        AtomicFiles.write(
            sessionDir(sessionId).resolve(FILE_SIGNATURE),
            EvidenceJson.instance.encodeToString(record).toByteArray(Charsets.UTF_8),
        )
        return sealResult
    }

    /** 读取签名记录（未签名会话返回 null）。 */
    fun loadSignatureRecord(sessionId: String): SignatureRecord? {
        val file = sessionDir(sessionId).resolve(FILE_SIGNATURE)
        if (!file.exists()) return null
        return try {
            EvidenceJson.instance.decodeFromString(file.readText())
        } catch (e: Exception) {
            throw StorageCorruptException("Unreadable signatures.json for $sessionId", e)
        }
    }

    /** 读取会话事件（供验证器装载；含读入侧坏行计数）。 */
    fun readSessionEvents(sessionId: String): EventLogReadResult = readEvents(sessionId)

    /** 读取会话文件登记（供验证器装载）。 */
    fun readSessionFiles(sessionId: String): List<EvidenceFile> = readRegistry(sessionId).files

    /** 读取会话格式版本（供验证器装载）。 */
    fun readSessionFormatVersion(sessionId: String): Int = loadSession(sessionId).formatVersion

    /**
     * 按相对路径读取会话内文件字节（供验证器重算哈希）。
     * 路径安全校验后读取；文件不存在或路径非法抛 [StorageException]。
     */
    fun readFileBytes(sessionId: String, relativePath: String): ByteArray {
        val relative = PathSafety.requireSafeRelativePath(relativePath, relativePath.substringBefore('/'))
        val absolute = PathSafety.resolveInside(sessionDir(sessionId), relative)
        if (!absolute.exists()) throw StorageException("File missing: $relativePath")
        return Files.readAllBytes(absolute)
    }

    /**
     * 封存后复核：重算全部材料并与 seal.json 快照逐项比较。
     * **只读**；报告「与封存快照是否一致」，不宣称内容真实。
     *
     * matchesSeal 判定（严格）：
     * - 文件仍在登记表中，且登记生命周期与封存一致；
     * - FINALIZED 文件：**重新计算的摘要**与封存哈希一致（捕获媒体被改），
     *   且登记哈希未被改写（捕获登记表被改）；
     * - INCOMPLETE 文件：仍为未完成状态（内容本就未封存，无法比对字节——已知限制）。
     * 注意：即使全部一致，若 [SealVerification.sealedWithAnomalies] 为 true，
     * 说明封存时已存在并披露异常（调用方必须如实呈现该标志）。
     */
    fun verifySeal(sessionId: String): SealVerification {
        val seal = loadSeal(sessionId)
        val registry = readRegistry(sessionId)
        val byId = registry.files.associateBy { it.fileId }

        val fileMatches = seal.files.map { entry ->
            val current = byId[entry.fileId]
            val (status, recomputedDigest) = current?.let { recomputeDigest(sessionId, it) }
                ?: (null to null)
            val matches = when {
                current == null -> false
                current.lifecycle != entry.lifecycle -> false
                entry.sha256 != null -> recomputedDigest == entry.sha256 &&
                    current.sha256 == entry.sha256
                else -> status == VerificationStatus.UNFINISHED
            }
            SealFileMatch(
                fileId = entry.fileId,
                relativePath = entry.relativePath,
                sealedSha256 = entry.sha256,
                currentSha256 = current?.sha256,
                sealedLifecycle = entry.lifecycle,
                currentLifecycle = current?.lifecycle,
                matchesSeal = matches,
                currentVerification = status,
            )
        }

        val eventsFile = sessionDir(sessionId).resolve(FILE_EVENTS)
        val currentEventsSha = sha256OfFileOrEmpty(eventsFile)
        val eventsMatch = currentEventsSha == seal.eventsSha256

        val locationsFile = sessionDir(sessionId).resolve(FILE_LOCATIONS)
        val locationsMatch = if (seal.locationsSha256 == null) {
            !locationsFile.exists()
        } else {
            locationsFile.exists() && sha256OfFileOrEmpty(locationsFile) == seal.locationsSha256
        }

        return SealVerification(
            sessionId = sessionId,
            sealedWithAnomalies = seal.sealedWithAnomalies,
            eventsMatch = eventsMatch,
            locationsMatch = locationsMatch,
            files = fileMatches,
            allMatch = eventsMatch && locationsMatch && fileMatches.all { it.matchesSeal },
        )
    }

    // ---------------------------------------------------------------- 恢复

    /**
     * 启动恢复扫描：把处于 CREATED/RECORDING/PAUSED 的会话如实标记为 ABORTED，
     * 并记录 recovery_observed 事件；其 REGISTERED 文件标记为 INCOMPLETE。
     * STOPPED（待封存）与终态会话不动。仅记录观察到的事实，不推测中断原因。
     */
    fun recoverOnStartup(): List<RecoveryRecord> {
        val recovered = mutableListOf<RecoveryRecord>()
        for (sessionId in listSessionIds()) {
            val session = try {
                loadSession(sessionId)
            } catch (_: StorageException) {
                // 无法读取的会话目录不在此处理（verify/报告阶段另行如实标记）
                continue
            }
            if (session.state !in setOf(SessionState.CREATED, SessionState.RECORDING, SessionState.PAUSED)) {
                continue
            }
            val fromState = session.state
            // 先记录观察到的事实，再记录应用执行的动作（顺序可审计）
            appendEvent(
                sessionId,
                EventTypes.RECOVERY_OBSERVED,
                EventSource.APP_OBSERVATION,
                payload = JsonObject(mapOf("observedState" to JsonPrimitive(fromState.name))),
            )
            val incompleteIds = markRegisteredFilesIncomplete(sessionId, "aborted during recovery")
            appendEvent(
                sessionId,
                EventTypes.SESSION_ABORTED,
                EventSource.APP_OBSERVATION,
                payload = JsonObject(
                    mapOf(
                        "fromState" to JsonPrimitive(fromState.name),
                        "markedIncompleteFiles" to JsonPrimitive(incompleteIds.size),
                    ),
                ),
            )
            writeSession(session.copy(state = SessionState.ABORTED))
            recovered.add(RecoveryRecord(sessionId, fromState, incompleteIds))
        }
        return recovered
    }

    // ---------------------------------------------------------------- 内部

    private fun sessionsRoot(): Path = root.resolve(DIR_SESSIONS)

    private fun sessionDir(sessionId: String): Path {
        PathSafety.requireSafeSessionId(sessionId)
        return sessionsRoot().resolve(sessionId)
    }

    private fun requireNotSealed(sessionId: String): EvidenceSession {
        val session = loadSession(sessionId)
        if (session.state == SessionState.SEALED) throw SessionSealedException(sessionId)
        return session
    }

    private fun writeSession(session: EvidenceSession) {
        AtomicFiles.write(
            sessionDir(session.sessionId).resolve(FILE_SESSION),
            EvidenceJson.instance.encodeToString(session).toByteArray(Charsets.UTF_8),
        )
    }

    private fun readRegistry(sessionId: String): FileRegistry {
        val file = sessionDir(sessionId).resolve(FILE_REGISTRY)
        if (!file.exists()) return FileRegistry()
        return try {
            EvidenceJson.instance.decodeFromString(file.readText())
        } catch (e: Exception) {
            throw StorageCorruptException("Unreadable files.json for $sessionId", e)
        }
    }

    private fun writeRegistry(sessionId: String, registry: FileRegistry) {
        AtomicFiles.write(
            sessionDir(sessionId).resolve(FILE_REGISTRY),
            EvidenceJson.instance.encodeToString(registry).toByteArray(Charsets.UTF_8),
        )
    }

    private fun requireFile(registry: FileRegistry, fileId: String): EvidenceFile =
        registry.files.firstOrNull { it.fileId == fileId }
            ?: throw StorageException("File not registered: $fileId")

    private fun verifyRecord(sessionId: String, record: EvidenceFile): VerificationStatus =
        recomputeDigest(sessionId, record).first

    /** 只读重算：返回（校验状态，重新计算的摘要[不可计算时为 null]）。不覆盖、不修复。 */
    private fun recomputeDigest(
        sessionId: String,
        record: EvidenceFile,
    ): Pair<VerificationStatus, String?> {
        val absolute = PathSafety.resolveInside(sessionDir(sessionId), Paths.get(record.relativePath))
        if (!absolute.exists()) return VerificationStatus.MISSING to null
        if (record.lifecycle != FileLifecycle.FINALIZED || record.sha256 == null) {
            return VerificationStatus.UNFINISHED to null
        }
        return try {
            val digest = absolute.toFile().inputStream().buffered().use { Sha256.of(it) }
            val status = if (digest == record.sha256) {
                VerificationStatus.PASS
            } else {
                VerificationStatus.FAIL
            }
            status to digest
        } catch (_: IOException) {
            VerificationStatus.UNREADABLE to null
        }
    }

    private fun markRegisteredFilesIncomplete(sessionId: String, note: String): List<String> {
        val registry = readRegistry(sessionId)
        val targets = registry.files.filter { it.lifecycle == FileLifecycle.REGISTERED }
        if (targets.isEmpty()) return emptyList()
        val updated = registry.copy(
            files = targets.fold(registry.files) { acc, record ->
                acc.replace(record.copy(lifecycle = FileLifecycle.INCOMPLETE, note = note))
            },
        )
        writeRegistry(sessionId, updated)
        for (record in targets) {
            appendEvent(
                sessionId, EventTypes.FILE_INCOMPLETE, EventSource.APP_OBSERVATION,
                payload = filePayload(record.copy(lifecycle = FileLifecycle.INCOMPLETE, note = note)),
            )
        }
        return targets.map { it.fileId }
    }

    private fun openState(sessionId: String): OpenState =
        openStates.getOrPut(sessionId) {
            val existing = readEvents(sessionId).events
            OpenState(
                nextEventSeq = existing.maxOfOrNull { it.seq }?.plus(1) ?: 1L,
                nextLocationSeq = readLocations(sessionId).locations.maxOfOrNull { it.seq }?.plus(1) ?: 1L,
                // 链尾基线跨实例恢复：取末条**已入链**事件的 hash（阶段 7 起写入）；
                // 兼容阶段 7 前的历史会话（全部为 PRE_CHAIN）→ null → 新事件作为创世。
                lastEventHash = existing.lastOrNull { it.hash != null }?.hash,
            )
        }

    private fun nextEventSeq(sessionId: String): Long {
        val state = openState(sessionId)
        val seq = state.nextEventSeq
        state.nextEventSeq = seq + 1
        return seq
    }

    private fun nextLocationSeq(sessionId: String): Long {
        val state = openState(sessionId)
        val seq = state.nextLocationSeq
        state.nextLocationSeq = seq + 1
        return seq
    }

    private fun sha256OfFileOrEmpty(file: Path): String =
        if (file.exists()) {
            file.toFile().inputStream().buffered().use { Sha256.of(it) }
        } else {
            Sha256.of(ByteArray(0))
        }

    private fun filePayload(record: EvidenceFile): JsonObject = JsonObject(
        buildMap {
            put("fileId", JsonPrimitive(record.fileId))
            put("relativePath", JsonPrimitive(record.relativePath))
            put("lifecycle", JsonPrimitive(record.lifecycle.name))
            record.sha256?.let { put("sha256", JsonPrimitive(it)) }
            record.sizeBytes?.let { put("sizeBytes", JsonPrimitive(it)) }
        },
    )

    private fun requireSafeFileName(fileName: String) {
        if (!SAFE_FILE_NAME.matches(fileName)) {
            throw UnsafePathException("Unsafe file name: $fileName")
        }
    }

    companion object {
        const val DIR_SESSIONS = "sessions"
        const val DIR_MEDIA = "media"
        const val DIR_DERIVED = "derived"
        const val FILE_SESSION = "session.json"
        const val FILE_REGISTRY = "files.json"
        const val FILE_EVENTS = "events.log"
        const val FILE_LOCATIONS = "locations.jsonl"
        const val FILE_SEAL = "seal.json"
        const val FILE_SIGNATURE = "signatures.json"

        private val SAFE_FILE_NAME = Regex("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")

        private fun List<EvidenceFile>.replace(record: EvidenceFile): List<EvidenceFile> =
            map { if (it.fileId == record.fileId) record else it }
    }
}

/** [EvidenceStore.registerFile] 的返回句柄。 */
data class RegisteredFile(
    val fileId: String,
    val relativePath: String,
    val absolutePath: Path,
)

data class EventLogReadResult(
    val events: List<EvidenceEvent>,
    val skippedLines: Long,
)

data class LocationLogReadResult(
    val locations: List<EvidenceLocation>,
    val skippedLines: Long,
)

data class SealResult(val record: SealRecord)

data class SealFileMatch(
    val fileId: String,
    val relativePath: String,
    val sealedSha256: String?,
    val currentSha256: String?,
    val sealedLifecycle: FileLifecycle,
    val currentLifecycle: FileLifecycle?,
    val matchesSeal: Boolean,
    val currentVerification: VerificationStatus?,
)

data class SealVerification(
    val sessionId: String,
    val sealedWithAnomalies: Boolean,
    val eventsMatch: Boolean,
    val locationsMatch: Boolean,
    val files: List<SealFileMatch>,
    val allMatch: Boolean,
)

data class RecoveryRecord(
    val sessionId: String,
    val observedState: SessionState,
    val markedIncompleteFileIds: List<String>,
)

/** [EvidenceStore.completeRecordingSave] 的结果。 */
sealed interface SaveOutcome {
    /**
     * 文件已封装 + 校验通过 + 保存记录已持久化。
     * [incompleteFileIds] 为未封装成功的次级输出（如内部音频轨）——如实披露，不得称其已保存。
     */
    data class Saved(
        val session: EvidenceSession,
        val file: EvidenceFile,
        val incompleteFileIds: List<String> = emptyList(),
    ) : SaveOutcome

    /** 保存未完成：文件保留、会话 saveStatus=FAILED、原因已记录（界面不得显示成功）。 */
    data class Failed(val session: EvidenceSession?, val reason: String) : SaveOutcome
}

/** [EvidenceStore.recoverPendingSaves] 的单会话恢复结果。 */
data class SaveRecoveryRecord(
    val sessionId: String,
    val saved: Boolean,
)
