package com.du.hello_mp.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.du.hello_mp.entity.User;
import com.du.hello_mp.service.UserService;
import com.du.hello_mp.mapper.UserMapper;
import org.springframework.stereotype.Service;

/**
* @author 16782
* @description 针对表【user】的数据库操作Service实现
* @createDate 2024-07-25 09:36:28
*/
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User>
    implements UserService{

}




