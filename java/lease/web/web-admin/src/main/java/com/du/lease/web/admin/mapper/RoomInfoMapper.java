package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.RoomInfo;
import com.du.lease.web.admin.vo.room.RoomItemVo;
import com.du.lease.web.admin.vo.room.RoomQueryVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;

/**
* @author weicheng
* @description 针对表【room_info(房间信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.RoomInfo
*/
public interface RoomInfoMapper extends BaseMapper<RoomInfo> {

    IPage<RoomItemVo> pageRoomItemByQuery(IPage<RoomItemVo> page, RoomQueryVo queryVo);
}




