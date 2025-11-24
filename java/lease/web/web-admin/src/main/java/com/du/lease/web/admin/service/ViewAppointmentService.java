package com.du.lease.web.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.du.lease.model.entity.ViewAppointment;
import com.du.lease.web.admin.vo.appointment.AppointmentQueryVo;
import com.du.lease.web.admin.vo.appointment.AppointmentVo;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;

/**
* @author weicheng
* @description 针对表【view_appointment(预约看房信息表)】的数据库操作Service

*/
public interface ViewAppointmentService extends IService<ViewAppointment> {

    IPage<AppointmentVo> pageAppointment(Page<AppointmentVo> appointmentVoPage, AppointmentQueryVo queryVo);
}
