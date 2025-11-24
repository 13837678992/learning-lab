package com.du.hello_mp.page;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.du.hello_mp.entity.User;
import com.du.hello_mp.mapper.UserMapper;
import com.du.hello_mp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class PageTest {
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private UserService userService;

    //通用Service分页查询
    @Test
    public void testPageService() {
        IPage<User> userPage = new Page<>(2, 5);
        userService.page(userPage).getRecords().forEach(System.out::println);
    }

    //通用Mapper分页查询
    @Test
    public void testPageMapper() {
        IPage<User> userPage = new Page<>(2, 5);
        userMapper.selectPage(userPage,null).getRecords().forEach(System.out::println);
    }

    //自定义SQL分页查询
    @Test
    public void testCustomMapper() {
        IPage<User> userPage = new Page<>(2, 5);
        userMapper.selectUserPage(userPage).getRecords().forEach(System.out::println);
    }


}
