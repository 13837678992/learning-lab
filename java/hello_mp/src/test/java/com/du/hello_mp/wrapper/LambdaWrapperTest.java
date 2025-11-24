package com.du.hello_mp.wrapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.du.hello_mp.entity.User;
import com.du.hello_mp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class LambdaWrapperTest {
    @Autowired
    private UserService userService;

    @Test
    public void testLambdaQueryWrapper() {
        LambdaQueryWrapper<User> queryWrapper = new LambdaQueryWrapper<>();
//        userService.list(queryWrapper.eq(User::getName,"Tom")).forEach(System.out::println);
        userService.list(queryWrapper.like(User::getEmail,"baomidou.com").orderByDesc(User::getAge)).forEach(System.out::println);
    }

    @Test
    public void testLambdaUpdateWrapper() {
        LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
       userService.update(updateWrapper.eq(User::getName,"Tom").set(User::getEmail,"test@test.com"));
    }
}
