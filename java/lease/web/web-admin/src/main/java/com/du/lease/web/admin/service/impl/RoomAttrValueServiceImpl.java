package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.model.entity.RoomAttrValue;
import com.du.lease.web.admin.service.RoomAttrValueService;
import com.du.lease.web.admin.mapper.RoomAttrValueMapper;
import org.springframework.stereotype.Service;

/**
* @author weicheng
* @description 针对表【room_attr_value(房间&基本属性值关联表)】的数据库操作Service实现

*/
@Service
public class RoomAttrValueServiceImpl extends ServiceImpl<RoomAttrValueMapper, RoomAttrValue>
    implements RoomAttrValueService{

}




