package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.model.entity.ApartmentFeeValue;
import com.du.lease.web.admin.service.ApartmentFeeValueService;
import com.du.lease.web.admin.mapper.ApartmentFeeValueMapper;
import org.springframework.stereotype.Service;

/**
* @author weicheng
* @description 针对表【apartment_fee_value(公寓&杂费关联表)】的数据库操作Service实现

*/
@Service
public class ApartmentFeeValueServiceImpl extends ServiceImpl<ApartmentFeeValueMapper, ApartmentFeeValue>
    implements ApartmentFeeValueService{

}




