package com.du.lease.web.admin.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.du.lease.model.entity.LeaseAgreement;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.du.lease.web.admin.vo.agreement.AgreementQueryVo;
import com.du.lease.web.admin.vo.agreement.AgreementVo;

/**
* @author weicheng
* @description 针对表【lease_agreement(租约信息表)】的数据库操作Mapper

* @Entity com.du.lease.model.LeaseAgreement
*/
public interface LeaseAgreementMapper extends BaseMapper<LeaseAgreement> {

    IPage<AgreementVo> pageAgreement(Page<AgreementVo> agreementVoPage, AgreementQueryVo queryVo);
}




