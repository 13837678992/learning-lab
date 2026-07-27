# 部署文档


---


# 一、构建流程


## 主应用构建


```bash
cd main-layout
npm install
npm run build
```


产物目录：main-layout/dist


## 子应用构建


```bash
cd app-demo
npm install
npm run build
```


产物目录：app-demo/dist


---


# 二、环境配置


每个应用包含三个环境配置文件：


- .env.dev：开发环境
- .env.test：测试环境
- .env.prod：生产环境


配置项：


- VUE_APP_BASE_API：API 基础路径
- VUE_APP_ENV：环境标识


构建时通过 --env 参数选择环境：


```bash
npm run build        # 使用 .env.prod
npm run build:dev    # 使用 .env.dev
```


---


# 三、Nginx 配置


## 方案一：多域名部署


每个应用使用独立域名。


配置文件：deploy/nginx/fmac-multi-domain.conf


- main.example.com → 主应用
- demo.example.com → 子应用


## 方案二：单域名部署


所有应用共用一个域名，通过路径区分。


配置文件：deploy/nginx/fmac-single-domain.conf


- / → 主应用
- /app-demo/ → 子应用（反向代理）


---


# 四、静态资源配置


Nginx 对静态资源设置长缓存：


- /js/：30天，immutable
- /css/：30天，immutable
- /img/：30天


HTML 文件不缓存（使用默认行为）。


---


# 五、主应用部署


1. 构建：cd main-layout && npm run build
2. 上传 dist 目录到服务器：/usr/share/nginx/html/main-layout
3. 配置 Nginx（选择多域名或单域名方案）
4. 重载 Nginx：nginx -s reload


---


# 六、子应用部署


1. 构建：cd app-demo && npm run build
2. 上传 dist 目录到服务器：/usr/share/nginx/html/app-demo
3. 配置子应用入口地址：
   - 多域名：demo.example.com
   - 单域名：app.example.com/app-demo/
4. 在主应用菜单配置中设置子应用 entry 地址


---


# 七、子应用注册地址


子应用注册到主应用时，需要配置 entry 地址。


多域名模式：


```json
{
  "app_code": "app-demo",
  "app_name": "示例应用",
  "entry": "//demo.example.com",
  "route": "/app-demo",
  "permission": ["view"]
}
```


单域名模式：


```json
{
  "app_code": "app-demo",
  "app_name": "示例应用",
  "entry": "//app.example.com/app-demo/",
  "route": "/app-demo",
  "permission": ["view"]
}
```


---


# 八、部署检查清单


1. 主应用构建产物是否完整
2. 子应用构建产物是否完整
3. Nginx 配置是否正确
4. 子应用 entry 地址是否可达
5. API 代理是否配置正确
6. CORS 头是否正确（子应用需要 Access-Control-Allow-Origin: *）
7. 静态资源缓存是否生效
8. history 路由 fallback 是否配置
