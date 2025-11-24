package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.FeeValue;
import com.du.lease.web.admin.vo.fee.FeeValueVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【fee_value(杂项费用值表)】的数据库操作Mapper

* @Entity com.du.lease.model.FeeValue
*/
public interface FeeValueMapper extends BaseMapper<FeeValue> {

    List<FeeValueVo> selectListByApartmentId(Long id);
}




