package com.du.lease.web.admin.service;

import com.du.lease.model.entity.AttrKey;
import com.du.lease.web.admin.vo.attr.AttrKeyVo;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;

/**
* @author weicheng
* @description 针对表【attr_key(房间基本属性表)】的数据库操作Service

*/
public interface AttrKeyService extends IService<AttrKey> {

    List<AttrKeyVo> listAttrInfo();
}
