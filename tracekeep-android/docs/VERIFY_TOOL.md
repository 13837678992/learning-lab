# 独立离线验证工具（阶段 10）

## 用途

在不安装 TraceKeep、不访问手机、不联网、不持有私钥的前提下，复核一份 **TraceKeep 证据包**
（阶段 9 导出物）的完整性与签名。满足 `PROJECT_REQUIREMENTS.md` §6 的验收要求。

## 运行方式

从源码构建可执行脚本（需 JDK 17）：

```bash
./gradlew :core:verify:installDist
# 产物：core/verify/build/install/verify/bin/verify
```

然后对证据包目录运行（**离线，无需网络**）：

```bash
core/verify/build/install/verify/bin/verify /path/to/TraceKeep-xxxxxxxx
```

或直接经 Gradle：

```bash
./gradlew :core:verify:run --args="/path/to/TraceKeep-xxxxxxxx"
```

## 输出语义

逐项输出 `PASS` / `FAIL` / `WARN` / `SKIPPED`，每项附原因（检查项 ID 稳定，供脚本引用）：

| ID | 项 | 含义 |
|---|---|---|
| `format_version` | 证据格式版本兼容性 | 清单的 `formatVersion` 是否在验证器支持范围内（不支持的格式明确报 FAIL，不静默通过） |
| `path_safety` | 路径安全（穿越/符号链接） | 清单相对路径不得为空/绝对/含反斜杠/含 `..`；解析到 `media/` 后必须仍在其内且不经符号链接（**不信任清单**，任一违规 → FAIL） |
| `file_integrity` | 文件完整性（重算 SHA-256） | 对清单登记的每个媒体文件重算摘要并比对（任一不符或缺失 → FAIL；未封装文件 WARN） |
| `unreferenced_files` | 未引用文件 | `media/` 下存在但清单未登记的文件 → WARN 并逐一列出（可能是附加材料，但必须披露） |
| `hash_chain` | 事件哈希链连续性 | 逐条校验 `logs/events.log` 的 prevHash/hash 链接、序号连续（阶段 7 前历史事件记 WARN 并计数） |
| `signature` | 签名验证 | 用 `signatures/` 内公钥验证 `signatures.json`（缺公钥 → SKIPPED，不当作通过） |
| `signature_file_binding` | 清单与签名绑定 | 签名对象覆盖的文件摘要须与清单登记哈希一致——用于发现「清单与媒体被同时改写」（无签名 → SKIPPED） |

**退出码**：任一 `FAIL` → `1`；全部非 FAIL → `0`；用法错误 → `2`。

## 能力边界（必须理解，不得断章取义）

- 哈希一致仅说明**字节未变**，不等于内容真实；
- 哈希链完整仅说明**事件序列未被改动**，不是可信时间证明；
- 签名有效仅说明内容**由对应私钥签署**，不代表身份已获外部认证或内容真实；
- 本工具**不判断**证据的真实性、合法性、关联性或是否被法院采信。

## 隐私

- 全程**离线**，工具不含任何网络调用；
- 只读取证据包目录，不访问原 App 数据库、运行状态或私钥；
- 不产生任何上传行为。

## 已知限制

- 公钥须随包提供（`signatures/public-keys.json` 或 `manifest.json` 内嵌）；仅哈希链可独立复核。
- 若清单缺失，工具退化为"仅按包内文件与日志"验证并给出 WARN 提示。
- 证据包格式版本升级时，验证器需同步升级 `supportedFormatVersion`（不兼容会明确 FAIL）。
