package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.SystemUser;
import com.du.lease.web.admin.vo.system.user.SystemUserItemVo;
import com.du.lease.web.admin.vo.system.user.SystemUserQueryVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;

/**
* @author weicheng
* @description 针对表【system_user(员工信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.SystemUser
*/
public interface SystemUserMapper extends BaseMapper<SystemUser> {

    IPage<SystemUserItemVo> pageSystemUserByQuery(IPage<SystemUser> page, SystemUserQueryVo queryVo);

    SystemUser selectOneByUsername(String username);
}




