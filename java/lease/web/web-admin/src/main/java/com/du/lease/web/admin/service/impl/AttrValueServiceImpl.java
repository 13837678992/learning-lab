package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.model.entity.AttrValue;
import com.du.lease.web.admin.service.AttrValueService;
import com.du.lease.web.admin.mapper.AttrValueMapper;
import org.springframework.stereotype.Service;

/**
* @author weicheng
* @description 针对表【attr_value(房间基本属性值表)】的数据库操作Service实现

*/
@Service
public class AttrValueServiceImpl extends ServiceImpl<AttrValueMapper, AttrValue>
    implements AttrValueService{

}




