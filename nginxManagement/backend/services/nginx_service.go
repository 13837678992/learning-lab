package services

import (
	"fmt"
	"nginx-management-backend/models"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type NginxService struct {
	nginxPath string
	nginxRoot string
}

func NewNginxService(nginxPath string) *NginxService {
	return &NginxService{
		nginxPath: nginxPath,
		nginxRoot: filepath.Dir(nginxPath),
	}
}

// StartNginx 启动nginx
func (s *NginxService) StartNginx() (*models.CommandRecord, error) {
	// 确保logs目录存在
	logsDir := filepath.Join(s.nginxRoot, "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return nil, fmt.Errorf("创建logs目录失败: %v", err)
	}

	// 检查nginx是否已经在运行
	if s.IsNginxRunning() {
		return &models.CommandRecord{
			Status:  "success",
			Output:  "nginx已经在运行",
			Command: "nginx启动检查",
		}, nil
	}

	// 先测试配置
	testRecord, err := s.TestConfig()
	if err != nil || testRecord.Status != "success" {
		return nil, fmt.Errorf("nginx配置测试失败: %v", err)
	}

	// 构建启动命令 - 使用后台启动方式
	startCommand := "start /B nginx.exe -c conf/nginx.conf"

	// 通过命令服务执行并记录
	commandService := GetCommandService()
	record, err := commandService.ExecuteCommandWithDir(startCommand, s.nginxRoot)
	if err != nil {
		return nil, fmt.Errorf("启动nginx失败: %v", err)
	}

	// 等待nginx启动完成
	time.Sleep(1 * time.Second)

	// 检查nginx是否成功启动
	if s.IsNginxRunning() {
		record.Status = "success"
		record.Output = "nginx启动成功"
	} else {
		record.Status = "error"
		record.ErrorMsg = "nginx启动失败，请检查配置和端口占用"
	}

	return record, nil
}

// StopNginx 停止nginx
func (s *NginxService) StopNginx() (*models.CommandRecord, error) {
	// 检查nginx是否在运行
	if !s.IsNginxRunning() {
		return &models.CommandRecord{
			Status:  "success",
			Output:  "nginx未运行",
			Command: "nginx停止检查",
		}, nil
	}

	// 构建停止命令
	stopCommand := "nginx.exe -s stop"

	// 通过命令服务执行并记录
	commandService := GetCommandService()
	record, err := commandService.ExecuteCommandWithDir(stopCommand, s.nginxRoot)
	if err != nil {
		return nil, fmt.Errorf("停止nginx失败: %v", err)
	}

	return record, nil
}

// ReloadNginx 重载nginx配置
func (s *NginxService) ReloadNginx() (*models.CommandRecord, error) {
	// 检查nginx是否在运行
	if !s.IsNginxRunning() {
		// nginx没有运行，先启动nginx
		startRecord, err := s.StartNginx()
		if err != nil {
			return nil, fmt.Errorf("启动nginx失败: %v", err)
		}
		if startRecord.Status != "success" {
			return nil, fmt.Errorf("启动nginx失败: %s", startRecord.ErrorMsg)
		}

		// 等待一下让nginx完全启动
		time.Sleep(2 * time.Second)
	}

	// 构建重载命令
	reloadCommand := "nginx.exe -s reload"

	// 通过命令服务执行并记录
	commandService := GetCommandService()
	record, err := commandService.ExecuteCommandWithDir(reloadCommand, s.nginxRoot)
	if err != nil {
		return nil, fmt.Errorf("重载nginx配置失败: %v", err)
	}

	return record, nil
}

// TestConfig 测试nginx配置
func (s *NginxService) TestConfig() (*models.CommandRecord, error) {
	// 构建测试命令
	testCommand := "nginx.exe -t"

	// 通过命令服务执行并记录
	commandService := GetCommandService()
	record, err := commandService.ExecuteCommandWithDir(testCommand, s.nginxRoot)
	if err != nil {
		return nil, fmt.Errorf("测试nginx配置失败: %v", err)
	}

	return record, nil
}

// IsNginxRunning 检查nginx是否在运行
func (s *NginxService) IsNginxRunning() bool {
	pidFile := filepath.Join(s.nginxRoot, "logs", "nginx.pid")

	// 1. 检查 pid 文件是否存在
	data, err := os.ReadFile(pidFile)
	if err != nil {
		return false
	}

	// 2. 读取进程 ID
	pidStr := strings.TrimSpace(string(data))
	if pidStr == "" {
		return false
	}

	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		return false
	}

	// 3. 检查进程是否真的存在
	handle, err := syscall.OpenProcess(syscall.PROCESS_QUERY_INFORMATION, false, uint32(pid))
	if err != nil {
		return false // 进程不存在
	}
	defer syscall.CloseHandle(handle)

	return true // 进程存在
}
