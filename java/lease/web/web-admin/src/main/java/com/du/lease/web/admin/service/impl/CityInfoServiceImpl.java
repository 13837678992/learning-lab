package com.du.lease.web.admin.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.lease.model.entity.CityInfo;
import com.du.lease.web.admin.service.CityInfoService;
import com.du.lease.web.admin.mapper.CityInfoMapper;
import org.springframework.stereotype.Service;

/**
* @author weicheng
* @description 针对表【city_info】的数据库操作Service实现

*/
@Service
public class CityInfoServiceImpl extends ServiceImpl<CityInfoMapper, CityInfo>
    implements CityInfoService{

}




