# 协议文档 - large-qrcode-transfer

## 二维码数据格式

每个二维码包含一个 JSON 字符串，格式如下：

```json
{
  "app": "large-qrcode-transfer",
  "version": "1.0",
  "id": "uuid-hex-string",
  "index": 1,
  "total": 10,
  "checksum": "md5-hex-string",
  "data": "base64-encoded-compressed-data"
}
```

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| app | string | 固定值 "large-qrcode-transfer" |
| version | string | 协议版本，当前为 "1.0" |
| id | string | 本次传输的唯一标识（32位hex） |
| index | number | 当前分片序号，从1开始 |
| total | number | 总分片数量 |
| checksum | string | 完整压缩数据的MD5校验值 |
| data | string | Base64编码的gzip压缩数据分片 |

## 数据传输流程

### 发送端
1. 原始文本 → UTF-8编码
2. UTF-8字节 → gzip压缩
3. 压缩数据 → Base64编码
4. Base64字符串 → 按2000字符分片
5. 每个分片封装为协议帧 → 生成二维码

### 接收端
1. 扫描所有二维码 → 解析协议帧
2. 按 index 排序 → 拼接 data 字段
3. MD5校验 → 验证数据完整性
4. Base64解码 → gzip解压
5. UTF-8解码 → 恢复原始文本

## 合并规则

- 同一 id 的分片属于同一次传输
- 按 index 升序排列拼接
- index 范围：1 到 total
- 所有分片的 checksum 必须一致

## 校验规则

- 使用 MD5 算法对完整 Base64 数据计算校验值
- 接收端拼接所有分片后重新计算 MD5
- 与帧中的 checksum 对比，一致则数据完整

## 错误处理

- 缺少分片：提示用户补充扫描
- checksum 不匹配：数据损坏，需重新传输
- 协议版本不匹配：提示升级
