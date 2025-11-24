package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"nginx-management-backend/models"
	"os"
	"os/exec"
	"sync"
	"time"

	"golang.org/x/text/encoding/simplifiedchinese"
	"golang.org/x/text/transform"
)

// GBK转UTF8工具函数
func gbkToUtf8(s string) string {
	reader := transform.NewReader(bytes.NewReader([]byte(s)), simplifiedchinese.GBK.NewDecoder())
	d, err := io.ReadAll(reader)
	if err != nil {
		return s // 转换失败就原样返回
	}
	return string(d)
}

type CommandService struct {
	recordsFile string
	records     []models.CommandRecord
	mutex       sync.RWMutex
	nextID      int
}

var commandService *CommandService

// GetCommandService 获取命令服务单例
func GetCommandService() *CommandService {
	if commandService == nil {
		commandService = &CommandService{
			recordsFile: "command_records.json",
			records:     make([]models.CommandRecord, 0),
			nextID:      1,
		}
		commandService.loadRecords()
	}
	return commandService
}

// ExecuteCommand 执行命令并记录
func (s *CommandService) ExecuteCommand(command string) (*models.CommandRecord, error) {
	return s.ExecuteCommandWithDir(command, "")
}

// ExecuteCommandWithDir 在指定目录下执行命令并记录
func (s *CommandService) ExecuteCommandWithDir(command string, workDir string) (*models.CommandRecord, error) {
	record := models.CommandRecord{
		ID:        s.nextID,
		Command:   command,
		Status:    "running",
		StartTime: time.Now(),
		CreatedAt: time.Now(),
	}
	s.nextID++

	// 添加到记录列表
	s.mutex.Lock()
	s.records = append(s.records, record)
	s.saveRecords()
	s.mutex.Unlock()

	// 执行命令
	cmd := exec.Command("cmd", "/C", command)
	if workDir != "" {
		cmd.Dir = workDir
	}

	// 获取输出管道
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.updateRecord(record.ID, "error", "", err.Error(), time.Now())
		return nil, err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		s.updateRecord(record.ID, "error", "", err.Error(), time.Now())
		return nil, err
	}

	// 启动命令
	if err := cmd.Start(); err != nil {
		s.updateRecord(record.ID, "error", "", err.Error(), time.Now())
		return nil, err
	}

	// 读取输出
	output := ""
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			output += scanner.Text() + "\n"
		}
	}()

	errorOutput := ""
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			errorOutput += scanner.Text() + "\n"
		}
	}()

	// 等待命令完成，设置超时
	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	// 设置30秒超时
	var cmdErr error
	select {
	case cmdErr = <-done:
		// 命令完成
	case <-time.After(30 * time.Second):
		// 超时，强制终止进程
		cmd.Process.Kill()
		cmdErr = fmt.Errorf("命令执行超时")
	}

	endTime := time.Now()

	// 等待goroutine完成读取
	time.Sleep(100 * time.Millisecond)
	// 编码转换
	output = gbkToUtf8(output)
	errorOutput = gbkToUtf8(errorOutput)

	if cmdErr != nil {
		errorMsg := cmdErr.Error()
		if errorOutput != "" {
			errorMsg = errorOutput
		}
		s.updateRecord(record.ID, "error", output, errorMsg, endTime)
	} else {
		s.updateRecord(record.ID, "success", output, "", endTime)
	}

	// 获取更新后的记录
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	for i := range s.records {
		if s.records[i].ID == record.ID {
			return &s.records[i], nil
		}
	}

	return nil, fmt.Errorf("record not found")
}

// GetRecords 获取所有记录
func (s *CommandService) GetRecords() []models.CommandRecord {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	// 返回副本以避免并发问题
	records := make([]models.CommandRecord, len(s.records))
	copy(records, s.records)
	return records
}

// GetRecord 获取单个记录
func (s *CommandService) GetRecord(id int) (*models.CommandRecord, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	for i := range s.records {
		if s.records[i].ID == id {
			return &s.records[i], nil
		}
	}
	return nil, fmt.Errorf("record not found")
}

// ClearRecords 清空记录
func (s *CommandService) ClearRecords() error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.records = make([]models.CommandRecord, 0)
	s.nextID = 1
	return s.saveRecords()
}

// updateRecord 更新记录
func (s *CommandService) updateRecord(id int, status, output, errorMsg string, endTime time.Time) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	for i := range s.records {
		if s.records[i].ID == id {
			s.records[i].Status = status
			s.records[i].Output = output
			s.records[i].ErrorMsg = errorMsg
			s.records[i].EndTime = endTime
			s.records[i].Duration = endTime.Sub(s.records[i].StartTime).Milliseconds()
			s.saveRecords()
			return
		}
	}
}

// loadRecords 从文件加载记录
func (s *CommandService) loadRecords() error {
	file, err := os.Open(s.recordsFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // 文件不存在是正常的
		}
		return err
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return err
	}

	if len(data) == 0 {
		return nil
	}

	err = json.Unmarshal(data, &s.records)
	if err != nil {
		return err
	}

	// 找到最大ID
	maxID := 0
	for i := range s.records {
		if s.records[i].ID > maxID {
			maxID = s.records[i].ID
		}
	}
	s.nextID = maxID + 1

	return nil
}

// saveRecords 保存记录到文件
func (s *CommandService) saveRecords() error {
	data, err := json.MarshalIndent(s.records, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.recordsFile, data, 0644)
}
