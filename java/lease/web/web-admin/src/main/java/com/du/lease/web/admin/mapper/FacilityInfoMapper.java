package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.FacilityInfo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【facility_info(配套信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.FacilityInfo
*/
public interface FacilityInfoMapper extends BaseMapper<FacilityInfo> {

    List<FacilityInfo> selectListByApartmentId(Long id);

    List<FacilityInfo> selectListByRoomId(Long id);
}




