package com.du.lease.web.admin.service;

import com.du.lease.model.entity.FeeKey;
import com.du.lease.web.admin.vo.fee.FeeKeyVo;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;

/**
* @author weicheng
* @description 针对表【fee_key(杂项费用名称表)】的数据库操作Service

*/
public interface FeeKeyService extends IService<FeeKey> {

    List<FeeKeyVo> feeInfoList();
}
