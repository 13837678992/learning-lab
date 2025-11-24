package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.GraphInfo;
import com.du.lease.model.enums.ItemType;
import com.du.lease.web.admin.vo.graph.GraphVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【graph_info(图片信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.GraphInfo
*/
public interface GraphInfoMapper extends BaseMapper<GraphInfo> {

    List<GraphVo> selectListByItemTypeAndId(ItemType itemType, Long id);
}




