package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.LeaseTerm;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【lease_term(租期)】的数据库操作Mapper

* @Entity com.du.lease.model.LeaseTerm
*/
public interface LeaseTermMapper extends BaseMapper<LeaseTerm> {

    List<LeaseTerm> selectListByRoomId(Long id);
}




