package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.LabelInfo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【label_info(标签信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.LabelInfo
*/
public interface LabelInfoMapper extends BaseMapper<LabelInfo> {

    List<LabelInfo> selectListByApartmentId(Long id);

    List<LabelInfo> selectListByRoomId(Long id);
}




