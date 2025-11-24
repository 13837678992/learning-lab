package com.du.hello_mp.service.impl;

import com.du.hello_mp.entity.User;
import com.du.hello_mp.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class UserServiceImplTest {
    @Autowired
    private UserService userService;

    @Test
    public void testGetById(){
        User user = userService.getById(1);
        System.out.println(user);
    }
    @Test
    public void testSaveOrUpdate(){
        User user = new User();
        user.setName("list");
        user.setAge(23);
        user.setEmail("list@qq.com");


        User user1 = userService.getById(3);
        user1.setAge(100);
        userService.saveOrUpdate(user1);
        userService.saveOrUpdate(user);

    }

    @Test
    public void testSaveBatch(){
        User user1 = new User();
        user1.setName("dongdong");
        user1.setAge(49);
        user1.setEmail("dongdong@email.com");

        User user2 = new User();
        user2.setName("nannan");
        user2.setAge(29);
        user2.setEmail("nannan@email.com");

        List<User> users = List.of(user1, user2);
        userService.saveBatch(users);
    }

}