# Nginx 可视化管理系统

这是一个基于 Vue.js 和 Go 的 Nginx 可视化管理系统，提供直观的 Web 界面来管理 Nginx 配置。

## 功能特性

- 📊 **仪表盘**: 实时显示 Nginx 运行状态和统计信息
- 🔧 **代理配置**: 可视化管理和配置 Nginx 代理规则
- 📝 **配置编辑**: 在线编辑和预览 Nginx 配置文件
- ✅ **配置测试**: 测试 Nginx 配置文件的语法正确性
- 🔄 **配置重载**: 一键重载 Nginx 配置
- 💻 **命令执行**: 通过Web界面执行Windows CMD命令并记录操作历史

## 项目结构

```
nginxManagement/
├── backend/                 # Go 后端服务
│   ├── main.go             # 主程序入口
│   ├── go.mod              # Go 模块依赖
│   └── nginx-1.28.0/       # Nginx 安装目录
│       └── conf/           # Nginx 配置文件目录
│           └── api.conf    # API 代理配置文件
├── frontend/               # Vue.js 前端应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   │   ├── dashboard/  # 仪表盘页面
│   │   │   ├── proxy/      # 代理配置页面
│   │   │   └── command/    # 命令执行页面
│   │   ├── api/            # API 接口
│   │   └── router/         # 路由配置
│   └── package.json        # 前端依赖
└── README.md              # 项目说明
```

## 快速开始

### 1. 安装依赖

#### 后端依赖
```bash
cd backend
go mod tidy
```

#### 前端依赖
```bash
cd frontend
npm install
```

### 2. 构建前端

```bash
cd frontend
npm run build
```

### 3. 运行应用

```bash
cd backend
go run main.go
```

应用将在 `http://localhost:8080` 启动，并自动打开浏览器。

## 代理配置页面使用说明

### 功能概述

代理配置页面允许您：

1. **查看现有配置**: 自动读取 nginx/conf/api.conf 文件
2. **添加代理规则**: 配置路径匹配和代理目标
3. **编辑代理设置**: 修改代理地址、描述等信息
4. **启用/禁用规则**: 通过开关控制代理规则是否生效
5. **预览配置**: 实时预览生成的 Nginx 配置内容
6. **测试配置**: 验证配置文件的语法正确性
7. **保存配置**: 将配置写入文件
8. **重载配置**: 重新加载 Nginx 配置

### 配置示例

#### 基本 API 代理
```
路径: /api/
代理地址: http://localhost:8080
描述: API接口代理
```

#### 用户服务代理
```
路径: /user/
代理地址: http://localhost:3001
描述: 用户服务代理
```

### 生成的 Nginx 配置

系统会自动生成标准的 Nginx 代理配置：

```nginx
# API代理配置文件
# 自动生成

# API接口代理
location /api/ {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## API 接口

### 代理配置相关接口

- `GET /api/proxy/config` - 获取代理配置
- `POST /api/proxy/config` - 保存代理配置
- `GET /api/proxy/read-config` - 读取配置文件
- `POST /api/proxy/write-config` - 写入配置文件
- `POST /api/proxy/test-config` - 测试配置
- `POST /api/proxy/reload-config` - 重载配置

### 命令执行相关接口

- `POST /api/command/execute` - 执行命令
- `GET /api/command/records` - 获取所有记录
- `GET /api/command/records/:id` - 获取单个记录
- `DELETE /api/command/records` - 清空所有记录

## 技术栈

- **前端**: Vue.js 3 + Element Plus + Vite
- **后端**: Go + Gin + CORS
- **服务器**: Nginx 1.28.0

## 注意事项

1. 确保 Nginx 已正确安装并配置
2. 配置文件路径默认为 `nginx-1.28.0/conf/api.conf`
3. 修改配置后建议先测试再重载
4. 重载配置需要 Nginx 进程正在运行
5. 命令执行功能会以当前用户权限执行，请谨慎使用
6. 命令记录保存在 `command_records.json` 文件中

## 开发

### 前端开发
```bash
cd frontend
npm run dev
```

### 后端开发
```bash
cd backend
go run main.go
```

## 许可证

MIT License 