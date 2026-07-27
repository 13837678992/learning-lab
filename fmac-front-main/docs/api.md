# API 文档


---


# 一、主应用 API


## POST /api/user/login


登录接口。


请求参数：


```json
{
  "username": "admin",
  "password": "123456"
}
```


响应：


```json
{
  "code": 200,
  "data": {
    "token": "mock-token-xxx",
    "username": "admin"
  },
  "message": "success"
}
```


---


## GET /api/user/info


获取用户信息。需要 Authorization header。


响应：


```json
{
  "code": 200,
  "data": {
    "username": "admin",
    "role": "管理员",
    "avatar": ""
  },
  "message": "success"
}
```


---


## GET /api/menu


获取菜单数据。需要 Authorization header。


响应：


```json
{
  "code": 200,
  "data": [
    {
      "app_code": "home",
      "app_name": "首页",
      "entry": "",
      "route": "/home",
      "permission": ["view"]
    },
    {
      "app_code": "app-demo",
      "app_name": "示例应用",
      "entry": "//localhost:9001",
      "route": "/app-demo",
      "permission": ["view"]
    }
  ],
  "message": "success"
}
```


---


# 二、子应用 API


## GET /api/demo/data


获取示例数据。需要 Authorization header。


响应：


```json
{
  "code": 200,
  "data": {
    "items": [
      { "id": 1, "name": "数据项 1", "status": "active" },
      { "id": 2, "name": "数据项 2", "status": "inactive" },
      { "id": 3, "name": "数据项 3", "status": "active" }
    ]
  },
  "message": "success"
}
```


---


# 三、通用说明


## 认证


所有需要认证的接口通过 Authorization header 传递 Bearer token：


```
Authorization: Bearer <token>
```


## 错误码


- 200：成功
- 400：参数错误
- 401：未授权（token 缺失或过期）
- 418：账号异常（强制退出）
- 500：服务异常


## 响应格式


```json
{
  "code": 200,
  "data": {},
  "message": "success"
}
```
