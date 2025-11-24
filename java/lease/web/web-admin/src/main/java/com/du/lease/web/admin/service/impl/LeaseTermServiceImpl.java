package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.model.entity.LeaseTerm;
import com.du.lease.web.admin.service.LeaseTermService;
import com.du.lease.web.admin.mapper.LeaseTermMapper;
import org.springframework.stereotype.Service;

/**
* @author weicheng
* @description 针对表【lease_term(租期)】的数据库操作Service实现

*/
@Service
public class LeaseTermServiceImpl extends ServiceImpl<LeaseTermMapper, LeaseTerm>
    implements LeaseTermService{

}




