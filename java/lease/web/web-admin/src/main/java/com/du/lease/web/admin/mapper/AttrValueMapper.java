package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.AttrValue;
import com.du.lease.web.admin.vo.attr.AttrValueVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【attr_value(房间基本属性值表)】的数据库操作Mapper

* @Entity com.du.lease.model.AttrValue
*/
public interface AttrValueMapper extends BaseMapper<AttrValue> {

    List<AttrValueVo> selectListByRoomId(Long id);
}




