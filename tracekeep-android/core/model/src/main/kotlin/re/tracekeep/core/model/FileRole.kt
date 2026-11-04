package re.tracekeep.core.model

/**
 * 文件角色（需求 §5、§6）。
 * ORIGINAL：录制产生的原始媒体，只读保全，禁止覆盖式编辑；
 * DERIVED：预览、缩略图、转码、标注、OCR 等处理副本，必须携带 [EvidenceFile.derivedFromFileId]
 * 指向原始文件，并且永远与原始文件分开保存。
 */
enum class FileRole {
    ORIGINAL,
    DERIVED,
}
