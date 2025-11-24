package com.du.lease.web.admin.service.impl;

import com.du.lease.model.entity.AttrKey;
import com.du.lease.web.admin.mapper.AttrKeyMapper;
import com.du.lease.web.admin.service.AttrKeyService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.web.admin.vo.attr.AttrKeyVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
* @author weicheng
* @description 针对表【attr_key(房间基本属性表)】的数据库操作Service实现

*/
@Service
public class AttrKeyServiceImpl extends ServiceImpl<AttrKeyMapper, AttrKey>
    implements AttrKeyService{
    @Autowired
    private AttrKeyMapper attrKeyMapper;
    @Override
    public List<AttrKeyVo> listAttrInfo() {
        return attrKeyMapper.listAttrInfo();
    }
}




