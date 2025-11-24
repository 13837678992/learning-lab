package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.ApartmentInfo;
import com.du.lease.model.enums.LeaseStatus;
import com.du.lease.web.admin.vo.apartment.ApartmentItemVo;
import com.du.lease.web.admin.vo.apartment.ApartmentQueryVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

/**
* @author weicheng
* @description 针对表【apartment_info(公寓信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.ApartmentInfo
*/
public interface ApartmentInfoMapper extends BaseMapper<ApartmentInfo> {

    IPage<ApartmentItemVo> pageItem(Page<ApartmentItemVo> Page, ApartmentQueryVo queryVo);
}




