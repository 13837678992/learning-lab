package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.PaymentType;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
 * @author weicheng
 * @description 针对表【payment_type(支付方式表)】的数据库操作Mapper
 
 * @Entity com.du.lease.model.PaymentType
 */
public interface PaymentTypeMapper extends BaseMapper<PaymentType> {

    List<PaymentType> selectListByRoomId(Long id);
}




