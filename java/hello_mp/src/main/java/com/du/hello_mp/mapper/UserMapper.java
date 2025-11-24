package com.du.hello_mp.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.du.hello_mp.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
* @author 16782
* @description 针对表【user】的数据库操作Mapper
* @createDate 2024-07-25 09:36:28
* @Entity com.du.hello_mp.entity.User
*/
@Mapper
public interface UserMapper extends BaseMapper<User> {

    IPage<User> selectUserPage(IPage<User> page);
}




