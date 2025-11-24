package routes

import (
	"net/http"
	"nginx-management-backend/handlers"
	"nginx-management-backend/services"

	"github.com/gin-gonic/gin"
)

// 设置路由
func SetupRoutes(router *gin.Engine, nginxPath, configDir string) {
	// 创建处理器
	nginxHandler := handlers.NewNginxHandler(nginxPath, configDir)
	proxyHandler := handlers.NewProxyHandler(configDir, nginxPath)
	commandHandler := handlers.NewCommandHandler()

	// Nginx相关API
	router.GET("/api/nginx/status", nginxHandler.GetStatus)
	router.GET("/api/nginx/info", nginxHandler.GetInfo)

	// 代理配置相关API
	router.GET("/api/proxy/config", proxyHandler.GetConfig)
	router.POST("/api/proxy/config", proxyHandler.SaveConfig)
	router.GET("/api/proxy/read-config", proxyHandler.ReadConfig)
	router.POST("/api/proxy/write-config", proxyHandler.WriteConfig)
	router.POST("/api/proxy/test-config", proxyHandler.TestConfig)
	router.POST("/api/proxy/reload-config", proxyHandler.ReloadConfig)
	router.POST("/api/proxy/start-nginx", proxyHandler.StartNginx)
	router.POST("/api/proxy/stop-nginx", proxyHandler.StopNginx)
	router.GET("/api/proxy/log", services.ReadProxyLog)
	router.POST("/api/proxy/clearLog", proxyHandler.ClearLog)

	// 命令执行相关API
	router.POST("/api/command/execute", commandHandler.ExecuteCommand)
	router.GET("/api/command/records", commandHandler.GetRecords)
	router.GET("/api/command/records/:id", commandHandler.GetRecord)
	router.DELETE("/api/command/records", commandHandler.ClearRecords)

	// 提供前端静态文件
	router.StaticFS("/assets", http.Dir("../frontend/dist/assets"))
	router.StaticFile("/", "../frontend/dist/index.html")
	router.StaticFile("/favicon.ico", "../frontend/dist/favicon.ico")
}
