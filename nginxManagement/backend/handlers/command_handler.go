package handlers

import (
	"net/http"
	"nginx-management-backend/models"
	"nginx-management-backend/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CommandHandler struct{}

func NewCommandHandler() *CommandHandler {
	return &CommandHandler{}
}

// ExecuteCommand 执行命令
func (h *CommandHandler) ExecuteCommand(c *gin.Context) {
	var request models.CommandRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.CommandResponse{
			Success: false,
			Message: "无效的请求参数: " + err.Error(),
		})
		return
	}

	commandService := services.GetCommandService()
	record, err := commandService.ExecuteCommand(request.Command)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.CommandResponse{
			Success: false,
			Message: "执行命令失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.CommandResponse{
		Success: true,
		Message: "命令执行完成",
		Data:    record,
	})
}

// GetRecords 获取所有命令记录
func (h *CommandHandler) GetRecords(c *gin.Context) {
	commandService := services.GetCommandService()
	records := commandService.GetRecords()

	c.JSON(http.StatusOK, models.CommandResponse{
		Success: true,
		Message: "获取记录成功",
		Data:    records,
	})
}

// GetRecord 获取单个命令记录
func (h *CommandHandler) GetRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.CommandResponse{
			Success: false,
			Message: "无效的记录ID",
		})
		return
	}

	commandService := services.GetCommandService()
	record, err := commandService.GetRecord(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.CommandResponse{
			Success: false,
			Message: "记录不存在",
		})
		return
	}

	c.JSON(http.StatusOK, models.CommandResponse{
		Success: true,
		Message: "获取记录成功",
		Data:    record,
	})
}

// ClearRecords 清空所有记录
func (h *CommandHandler) ClearRecords(c *gin.Context) {
	commandService := services.GetCommandService()
	err := commandService.ClearRecords()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.CommandResponse{
			Success: false,
			Message: "清空记录失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.CommandResponse{
		Success: true,
		Message: "记录已清空",
	})
}
