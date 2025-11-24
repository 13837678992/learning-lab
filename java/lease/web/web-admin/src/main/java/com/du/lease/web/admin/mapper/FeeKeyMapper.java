package com.du.lease.web.admin.mapper;

import com.du.lease.model.entity.FeeKey;
import com.du.lease.web.admin.vo.fee.FeeKeyVo;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;

/**
* @author weicheng
* @description 针对表【fee_key(杂项费用名称表)】的数据库操作Mapper

* @Entity com.du.lease.model.FeeKey
*/
public interface FeeKeyMapper extends BaseMapper<FeeKey> {

    List<FeeKeyVo> feeInfoList();
}




