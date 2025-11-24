package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.model.entity.RoomLabel;
import com.du.lease.web.admin.service.RoomLabelService;
import com.du.lease.web.admin.mapper.RoomLabelMapper;
import org.springframework.stereotype.Service;

/**
* @author weicheng
* @description 针对表【room_label(房间&标签关联表)】的数据库操作Service实现

*/
@Service
public class RoomLabelServiceImpl extends ServiceImpl<RoomLabelMapper, RoomLabel>
    implements RoomLabelService{

}




