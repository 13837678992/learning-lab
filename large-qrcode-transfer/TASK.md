Windows 大容量二维码文本传输工具开发任务
项目名称

large-qrcode-transfer

一、项目背景

当前使用场景：

Windows 10 企业内网环境。

电脑和手机之间无法通过网络直接传输文本内容，需要通过二维码方式进行离线传输。

当前问题：

浏览器二维码工具存在以下限制：

单个二维码容量较小
大量文本需要人工拆分
每次复制内容有限制
生成效率低
中文文本容易超出容量限制

目标：

开发一个 Windows 本地工具，实现：

电脑复制大量文本

↓

本地压缩处理

↓

自动生成一个或多个大容量二维码

↓

手机扫码

↓

自动恢复完整文本

要求：

整个过程完全离线。

所有数据只在本机处理。

禁止上传任何数据。

二、开发目标

开发一个 Windows 平台工具：

large-qrcode-transfer

核心能力：

支持大文本输入
支持剪贴板读取
自动压缩文本
自动拆分二维码
连续二维码生成
手机扫码恢复
数据完整性校验
Windows exe 发布

目标传输能力：

支持：

10KB

100KB

500KB

1MB

2MB

以上文本数据。

三、技术方案
推荐技术栈

桌面端：

Electron

前端：

Vue3

JavaScript

构建：

Vite

二维码：

qrcode

或者

qr-code-styling

压缩：

pako

校验：

crypto-js

打包：

electron-builder

目标：

生成 Windows 可执行文件。

四、项目约束

必须：

支持 Windows 10
支持离线运行
不依赖服务器
不发送网络请求
不保存用户数据
不使用第三方统计
不上传任何内容

禁止：

云端二维码服务
在线接口
外部数据存储
五、功能需求
1. 文本输入模块

支持两种方式。

方式一：直接输入

提供文本框。

支持：

直接粘贴：

Ctrl + V

显示：

文本字符数量

文本字节大小

例如：

字符数量：

52000

数据大小：

86KB

方式二：读取剪贴板

提供按钮：

读取剪贴板

功能：

读取 Windows 当前剪贴板文本。

显示：

读取成功

文本大小

字符数量

2. 文本压缩模块

生成二维码前自动处理。

流程：

原始文本

↓

UTF-8编码

↓

gzip压缩

↓

Base64编码

↓

二维码生成

显示压缩效果。

例如：

原始大小：

500KB

压缩后：

80KB

压缩比例：

84%

3. 大容量二维码生成

支持：

自动计算二维码容量。

二维码参数：

纠错等级：

M

尺寸：

500px

1000px

1500px

2000px

支持：

高清 PNG 导出。

4. 自动分片功能

当数据超过单二维码容量时：

自动拆分。

例如：

输入：

1MB文本

生成：

二维码：

1 / 30

二维码：

2 / 30

...

二维码：

30 / 30

每个二维码必须包含：

传输头信息。

格式：

{
"app":"large-qrcode-transfer",
"version":"1.0",
"id":"uuid",
"index":1,
"total":30,
"checksum":"xxx",
"data":"xxxxx"
}

字段说明：

app：

应用标识

version：

协议版本

id：

本次传输唯一ID

index：

当前二维码编号

total：

二维码总数量

checksum：

数据校验值

data：

当前数据片段

5. 二维码浏览功能

界面显示：

当前二维码：

5 / 30

提供按钮：

上一张

下一张

自动播放

停止播放

6. 自动播放功能

支持连续扫码。

配置：

播放间隔：

500ms

1000ms

2000ms

例如：

自动播放30张二维码。

手机连续扫码完成恢复。

7. 手机恢复协议

手机扫码后：

自动识别：

large-qrcode-transfer

处理流程：

二维码1

↓

保存数据

二维码2

↓

保存数据

...

最后一个二维码

↓

合并数据

↓

校验checksum

↓

Base64解码

↓

gzip解压

↓

恢复原始文本

8. 数据校验

必须保证：

数据完整。

支持：

MD5

或者

CRC32

校验失败：

提示：

数据缺失

二维码编号错误

重新扫描

9. 导出功能

支持：

导出单张二维码。

格式：

PNG

文件名称：

transfer-001.png

transfer-002.png

支持：

批量导出。

支持：

ZIP压缩下载。

六、界面设计
主页面

布局：

顶部：

文本输入区域

中间：

二维码展示区域

底部：

操作按钮

按钮：

读取剪贴板

生成二维码

导出图片

上一张

下一张

自动播放

状态显示：

原始大小：

500KB

压缩大小：

80KB

二维码数量：

20

当前：

3 / 20

七、项目结构

large-qrcode-transfer

src

main

clipboard.js

ipc.js

renderer

components

TextInput.vue

QrcodeViewer.vue

ControlPanel.vue

utils

compress.js

split.js

checksum.js

core

encoder.js

decoder.js

protocol.js

docs

protocol.md

progress.md

package.json

electron-builder.yml

README.md

八、开发阶段
Phase 1 基础版本

完成：

Electron项目初始化
Vue页面搭建
文本输入
二维码生成

测试：

10000字符文本。

Phase 2 数据压缩

完成：

gzip压缩
Base64转换
压缩比例显示

测试：

100KB文本。

Phase 3 多二维码传输

完成：

自动分片
二维码编号
顺序管理
checksum校验

测试：

500KB文本。

Phase 4 完整恢复

完成：

多二维码合并
解码
解压
恢复原文

测试：

中文

英文

特殊字符

emoji

Phase 5 Windows发布

完成：

生成：

large-qrcode-transfer.exe

要求：

Windows10可运行。

提供：

portable版本。

九、测试要求

必须测试以下数据。

测试1

内容：

1000字符

验证：

二维码生成正常。

测试2

内容：

50KB

验证：

压缩正常。

测试3

内容：

500KB

验证：

多二维码生成。

测试4

内容：

2MB

验证：

大量二维码传输稳定。

测试内容必须包含：

中文

英文

数字

特殊符号

emoji

换行

十、开发执行要求

你现在作为：

高级 Windows 桌面应用工程师。

要求：

自动完成整个项目开发。

执行原则：

自动创建项目
自动安装依赖
自动编写代码
自动运行测试
自动修复问题

不要等待人工确认。

每完成一个阶段：

必须更新：

docs/progress.md

记录：

完成内容

存在问题

解决方案

下一阶段计划

十一、最终交付

必须输出：

完整源码
Windows exe
README文档
使用说明
二维码传输协议文档
测试报告
十二、后续扩展设计

架构需要支持未来扩展：

图片二维码传输
JSON配置传输
文件传输
代码文件传输
内网设备离线数据交换

设计时保留扩展能力。