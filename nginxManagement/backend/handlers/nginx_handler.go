package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type NginxHandler struct {
	NginxPath string
	ConfigDir string
}

func NewNginxHandler(nginxPath, configDir string) *NginxHandler {
	return &NginxHandler{
		NginxPath: nginxPath,
		ConfigDir: configDir,
	}
}

// 获取nginx状态
func (h *NginxHandler) GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":              "running",
		"version":             "1.23.3",
		"active_connections":  128,
		"requests_per_second": 35.6,
		"success_rate":        99.8,
	})
}

// 获取nginx信息
func (h *NginxHandler) GetInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"nginxPath": h.NginxPath,
		"configDir": h.ConfigDir,
	})
}
