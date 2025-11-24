package models

import (
	"time"
)

// CommandRecord 命令记录模型
type CommandRecord struct {
	ID        int       `json:"id"`
	Command   string    `json:"command"`   // 执行的命令
	Output    string    `json:"output"`    // 命令输出
	Status    string    `json:"status"`    // 执行状态：success, error, running
	StartTime time.Time `json:"startTime"` // 开始时间
	EndTime   time.Time `json:"endTime"`   // 结束时间
	Duration  int64     `json:"duration"`  // 执行时长（毫秒）
	ErrorMsg  string    `json:"errorMsg"`  // 错误信息
	CreatedAt time.Time `json:"createdAt"` // 创建时间
}

// CommandRequest 命令请求模型
type CommandRequest struct {
	Command string `json:"command" binding:"required"`
}

// CommandResponse 命令响应模型
type CommandResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
