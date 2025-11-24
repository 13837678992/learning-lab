package main

import (
	"log"
	"nginx-management-backend/routes"
	"nginx-management-backend/utils"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 获取当前工作目录
	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("无法获取当前工作目录: %v", err)
	}

	// 计算Nginx路径（相对于当前工作目录）
	nginxRoot := filepath.Join(currentDir, "nginx-1.28.0")
	nginxPath := filepath.Join(nginxRoot, "nginx.exe")
	configDir := filepath.Join(nginxRoot, "conf")

	// 创建Gin路由器
	router := gin.Default()

	// 配置CORS
	router.Use(cors.Default())

	// 设置路由
	routes.SetupRoutes(router, nginxPath, configDir)

	// 打开浏览器
	go func() {
		err := utils.OpenBrowser("http://localhost:8080")
		if err != nil {
			log.Printf("无法打开浏览器: %v", err)
		}
	}()

	log.Println("服务器启动在 :8080...")
	log.Fatal(router.Run(":8080"))
}
