package com.du.lease.web.admin.service;

import com.du.lease.model.entity.SystemUser;
import com.du.lease.web.admin.vo.system.user.SystemUserItemVo;
import com.du.lease.web.admin.vo.system.user.SystemUserQueryVo;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;

/**
* @author weicheng
* @description 针对表【system_user(员工信息表)】的数据库操作Service

*/
public interface SystemUserService extends IService<SystemUser> {

    IPage<SystemUserItemVo> pageSystemUserByQuery(IPage<SystemUser> page, SystemUserQueryVo queryVo);

    SystemUserItemVo getSystemUserById(Long id);
}
