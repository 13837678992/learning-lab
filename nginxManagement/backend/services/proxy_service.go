package services

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"nginx-management-backend/models"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// 加载代理配置
func LoadProxyConfig(configPath string) (*models.ProxyConfig, error) {
	config := &models.ProxyConfig{
		ConfigPath: configPath,
		ProxyRules: []models.ProxyRule{},
	}

	// 如果配置文件不存在，返回默认配置
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		config.ProxyRules = []models.ProxyRule{
			{
				Title:    "端口801的API代理",
				Port:     "801",
				Location: "/api/",
				ProxyAddresses: []models.ProxyAddress{
					{URL: "http://localhost:8082", Comment: "新地址", IsActive: true},
					{URL: "http://localhost:8081", Comment: "新地址", IsActive: false},
					{URL: "http://localhost:8080", Comment: "新地址", IsActive: false},
				},
				ActiveIndex: 0,
				Description: "API接口代理",
				Enabled:     true,
			},
		}
		return config, nil
	}

	// 读取配置文件内容
	content, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	// 解析nginx配置
	rules := ParseNginxConfig(string(content))
	config.ProxyRules = rules

	return config, nil
}

// 保存代理配置
func SaveProxyConfig(configPath string, config models.ProxyConfig) error {
	// 生成nginx配置内容
	content := GenerateNginxConfig(config)

	// 写入文件
	return ioutil.WriteFile(configPath, []byte(content), 0644)
}

// 解析nginx配置文件
func ParseNginxConfig(content string) []models.ProxyRule {
	var rules []models.ProxyRule
	lines := strings.Split(content, "\n")

	fmt.Printf("开始解析配置文件，共 %d 行\n", len(lines))

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])

		// 查找server块
		if strings.HasPrefix(line, "server {") {
			fmt.Printf("找到server块，行号: %d\n", i+1)

			// 查找server块上方的注释作为title
			var title string
			if i > 0 && strings.HasPrefix(strings.TrimSpace(lines[i-1]), "#") {
				title = strings.TrimSpace(strings.TrimPrefix(lines[i-1], "#"))
				fmt.Printf("找到标题: %s\n", title)
			}

			// 查找listen端口
			port := "80"
			var j int
			var serverEnd int = -1
			for j = i + 1; j < len(lines); j++ {
				serverLine := strings.TrimSpace(lines[j])
				if strings.HasPrefix(serverLine, "listen") {
					listenParts := strings.Fields(serverLine)
					if len(listenParts) >= 2 {
						port = strings.TrimSuffix(listenParts[1], ";")
						fmt.Printf("找到端口: %s\n", port)
					}
				}
				if serverLine == "}" {
					serverEnd = j
					break
				}

				// 查找location块
				if strings.HasPrefix(serverLine, "location") {
					fmt.Printf("找到location块，行号: %d\n", j+1)
					location := strings.TrimSpace(strings.TrimPrefix(serverLine, "location"))
					location = strings.TrimSuffix(location, "{")
					location = strings.TrimSpace(location)
					fmt.Printf("location路径: %s\n", location)

					// 查找注释作为描述
					var description string
					if j > 0 && strings.HasPrefix(strings.TrimSpace(lines[j-1]), "#") {
						description = strings.TrimSpace(strings.TrimPrefix(lines[j-1], "#"))
					}

					// 在location块中查找所有proxy_pass
					var proxyAddresses []models.ProxyAddress
					var activeIndex int
					for k := j + 1; k < len(lines); k++ {
						blockLine := strings.TrimSpace(lines[k])
						if blockLine == "}" {
							break
						}
						if strings.HasPrefix(blockLine, "proxy_pass") || (strings.HasPrefix(blockLine, "#") && strings.Contains(blockLine, "proxy_pass")) {
							isActive := !strings.HasPrefix(blockLine, "#")
							var proxyPass string
							var comment string

							if isActive {
								if idx := strings.Index(blockLine, "#"); idx != -1 {
									proxyPass = strings.TrimSpace(blockLine[:idx])
									commentPart := strings.TrimSpace(blockLine[idx+1:])
									if strings.HasPrefix(commentPart, "R ") {
										comment = strings.TrimSpace(strings.TrimPrefix(commentPart, "R "))
									} else {
										comment = strings.TrimSpace(strings.Trim(commentPart, "#; "))
									}
								} else {
									proxyPass = blockLine
								}
								proxyPass = strings.TrimSpace(strings.TrimPrefix(proxyPass, "proxy_pass"))
								proxyPass = strings.TrimSuffix(proxyPass, ";")
							} else {
								cleanLine := strings.TrimSpace(strings.TrimPrefix(blockLine, "#"))
								if idx := strings.Index(cleanLine, "#"); idx != -1 {
									proxyPass = strings.TrimSpace(cleanLine[:idx])
									commentPart := strings.TrimSpace(cleanLine[idx+1:])
									if strings.HasPrefix(commentPart, "R ") {
										comment = strings.TrimSpace(strings.TrimPrefix(commentPart, "R "))
									} else {
										comment = strings.TrimSpace(strings.Trim(commentPart, "#; "))
									}
								} else {
									proxyPass = cleanLine
								}
								proxyPass = strings.TrimSpace(strings.TrimPrefix(proxyPass, "proxy_pass"))
								proxyPass = strings.TrimSuffix(proxyPass, ";")
							}

							if proxyPass != "" {
								proxyAddresses = append(proxyAddresses, models.ProxyAddress{
									URL:      proxyPass,
									Comment:  comment,
									IsActive: isActive,
								})
								if isActive {
									activeIndex = len(proxyAddresses) - 1
								}
								fmt.Printf("找到代理地址: %s (激活: %v)\n", proxyPass, isActive)
							}
						}
					}

					if len(proxyAddresses) > 0 {
						rule := models.ProxyRule{
							Title:          title,
							Port:           port,
							Location:       location,
							ProxyAddresses: proxyAddresses,
							ActiveIndex:    activeIndex,
							Description:    description,
							Enabled:        true,
						}
						rules = append(rules, rule)
						fmt.Printf("添加规则: 标题=%s, 端口=%s, 位置=%s\n", title, port, location)

						// 找到第一个location块后，跳出server块循环，避免重复解析
						break
					}
				}
			}
			// 跳到server块结尾，避免重复解析
			if serverEnd != -1 {
				i = serverEnd
			}
		}
	}

	fmt.Printf("解析完成，找到 %d 个规则\n", len(rules))

	// 去重：只保留 port+location 唯一的规则
	unique := make(map[string]bool)
	var deduped []models.ProxyRule
	for _, rule := range rules {
		key := rule.Port + "|" + rule.Location
		if !unique[key] {
			unique[key] = true
			deduped = append(deduped, rule)
		} else {
			fmt.Printf("发现重复规则，已跳过: 端口=%s, 位置=%s\n", rule.Port, rule.Location)
		}
	}

	fmt.Printf("去重后剩余 %d 个规则\n", len(deduped))
	return deduped
}

// 生成nginx配置内容
func GenerateNginxConfig(config models.ProxyConfig) string {
	var content strings.Builder

	content.WriteString("# API代理配置文件\n")
	content.WriteString("# 自动生成\n\n")

	for _, rule := range config.ProxyRules {
		if rule.Enabled && len(rule.ProxyAddresses) > 0 {
			if rule.Title != "" {
				content.WriteString("# " + rule.Title + "\n")
			}
			port := rule.Port
			if port == "" {
				port = "800"
			}
			content.WriteString("server {\n")
			content.WriteString("    listen       " + port + ";\n")
			content.WriteString("    server_name  localhost;\n\n")
			// 独立日志
			content.WriteString("    access_log  logs/api_" + port + "_access.log;\n")
			content.WriteString("    error_log   logs/api_" + port + "_error.log;\n\n")
			content.WriteString("    location " + rule.Location + " {\n")

			for i, addr := range rule.ProxyAddresses {
				cleanComment := strings.TrimSpace(strings.Trim(addr.Comment, "#; "))
				if i == rule.ActiveIndex {
					if cleanComment != "" {
						content.WriteString("        proxy_pass " + addr.URL + "; #R " + cleanComment + "\n")
					} else {
						content.WriteString("        proxy_pass " + addr.URL + ";\n")
					}
				} else {
					if cleanComment != "" {
						content.WriteString("        # proxy_pass " + addr.URL + "; #R " + cleanComment + "\n")
					} else {
						content.WriteString("        # proxy_pass " + addr.URL + ";\n")
					}
				}
			}

			content.WriteString("        proxy_set_header Host $host;\n")
			content.WriteString("        proxy_set_header X-Real-IP $remote_addr;\n")
			content.WriteString("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n")
			content.WriteString("        proxy_set_header X-Forwarded-Proto $scheme;\n")
			content.WriteString("    }\n")
			content.WriteString("}\n\n")
		}
	}

	return content.String()
}

// 新增：读取指定端口和类型的日志内容
func ReadProxyLog(c *gin.Context) {
	port := c.Query("port")
	logType := c.DefaultQuery("type", "access") // access 或 error
	if port == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "缺少端口参数"})
		return
	}
	var logFile string
	if logType == "error" {
		logFile = filepath.Join("nginx-1.28.0", "logs", "api_"+port+"_error.log")
	} else {
		logFile = filepath.Join("nginx-1.28.0", "logs", "api_"+port+"_access.log")
	}
	content, err := ioutil.ReadFile(logFile)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "读取日志失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": string(content)})
}

// 清空指定端口和类型的日志内容
func ClearProxyLog(port, logType string) error {
	var logFile string
	if logType == "error" {
		logFile = filepath.Join("nginx-1.28.0", "logs", "api_"+port+"_error.log")
	} else {
		logFile = filepath.Join("nginx-1.28.0", "logs", "api_"+port+"_access.log")
	}
	// 覆盖写入空内容
	return ioutil.WriteFile(logFile, []byte{}, 0644)
}
