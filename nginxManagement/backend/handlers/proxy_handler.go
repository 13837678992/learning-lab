package handlers

import (
	"io/ioutil"
	"net/http"
	"nginx-management-backend/models"
	"nginx-management-backend/services"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type ProxyHandler struct {
	ConfigDir string
	NginxPath string
}

func NewProxyHandler(configDir, nginxPath string) *ProxyHandler {
	return &ProxyHandler{
		ConfigDir: configDir,
		NginxPath: nginxPath,
	}
}

// 获取代理配置
func (h *ProxyHandler) GetConfig(c *gin.Context) {
	configPath := filepath.Join(h.ConfigDir, "api.conf")
	config, err := services.LoadProxyConfig(configPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "加载配置失败: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    config,
	})
}

// 保存代理配置
func (h *ProxyHandler) SaveConfig(c *gin.Context) {
	var config models.ProxyConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	configPath := filepath.Join(h.ConfigDir, "api.conf")
	if err := services.SaveProxyConfig(configPath, config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存配置失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "配置保存成功",
	})
}

// 读取配置文件
func (h *ProxyHandler) ReadConfig(c *gin.Context) {
	configPath := c.Query("configPath")
	if configPath == "" {
		configPath = filepath.Join(h.ConfigDir, "api.conf")
	}

	content, err := ioutil.ReadFile(configPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取配置文件失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    string(content),
	})
}

// 写入配置文件
func (h *ProxyHandler) WriteConfig(c *gin.Context) {
	var req struct {
		ConfigPath string `json:"configPath"`
		Content    string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if req.ConfigPath == "" {
		req.ConfigPath = filepath.Join(h.ConfigDir, "api.conf")
	}

	if err := ioutil.WriteFile(req.ConfigPath, []byte(req.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "写入配置文件失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "配置文件写入成功",
	})
}

// 测试配置
func (h *ProxyHandler) TestConfig(c *gin.Context) {
	// 使用新的nginx服务
	nginxService := services.NewNginxService(h.NginxPath)
	record, err := nginxService.TestConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "配置测试失败: " + err.Error(),
		})
		return
	}

	// 根据执行结果返回响应
	if record.Status == "success" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": record.Output,
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "配置测试失败: " + record.ErrorMsg,
		})
	}
}

// 重载配置
func (h *ProxyHandler) ReloadConfig(c *gin.Context) {
	// 使用新的nginx服务
	nginxService := services.NewNginxService(h.NginxPath)
	record, err := nginxService.ReloadNginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "重载配置失败: " + err.Error(),
		})
		return
	}

	// 根据执行结果返回响应
	if record.Status == "success" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": record.Output,
		})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "重载配置失败: " + record.ErrorMsg,
		})
	}
}

// 启动nginx
func (h *ProxyHandler) StartNginx(c *gin.Context) {
	// 使用新的nginx服务
	nginxService := services.NewNginxService(h.NginxPath)
	record, err := nginxService.StartNginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "启动nginx失败: " + err.Error(),
		})
		return
	}

	// 根据执行结果返回响应
	if record.Status == "success" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": record.Output,
		})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "启动nginx失败: " + record.ErrorMsg,
		})
	}
}

// 停止nginx
func (h *ProxyHandler) StopNginx(c *gin.Context) {
	// 使用新的nginx服务
	nginxService := services.NewNginxService(h.NginxPath)
	record, err := nginxService.StopNginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "停止nginx失败: " + err.Error(),
		})
		return
	}

	// 根据执行结果返回响应
	if record.Status == "success" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": record.Output,
		})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "停止nginx失败: " + record.ErrorMsg,
		})
	}
}

// 清除日志
func (h *ProxyHandler) ClearLog(c *gin.Context) {
	var req struct {
		Port string `json:"port"`
		Type string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}
	if req.Port == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "缺少端口参数",
		})
		return
	}
	if req.Type == "" {
		req.Type = "access"
	}
	if err := services.ClearProxyLog(req.Port, req.Type); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "清除日志失败: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "日志已清除",
	})
}
