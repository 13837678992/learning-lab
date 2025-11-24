package com.du.lease.web.admin.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.du.lease.model.entity.LeaseAgreement;
import com.du.lease.web.admin.vo.agreement.AgreementQueryVo;
import com.du.lease.web.admin.vo.agreement.AgreementVo;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;

/**
* @author weicheng
* @description 针对表【lease_agreement(租约信息表)】的数据库操作Service

*/
public interface LeaseAgreementService extends IService<LeaseAgreement> {

    IPage<AgreementVo> pageAgreement(Page<AgreementVo> agreementVoPage, AgreementQueryVo queryVo);

    AgreementVo getAgreementById(Long id);
}
