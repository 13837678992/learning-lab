package com.du.hello_mp.mapper;

import com.du.hello_mp.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class UserMapperTest {
    @Autowired
    private UserMapper userMapper;

    @Test
    public void testList(){
        List<User> users = userMapper.selectList(null);
        users.forEach(System.out::println);
    }

    @Test
    public void testInsert(){
        User user = new User();
        user.setAge(45);
        user.setName("zhangsan");
        user.setEmail("google@gmail");
        userMapper.insert(user);
    }

    @Test
    public void testSelectById(){
        User user = userMapper.selectById(1);
        System.out.println(user);
    }
    @Test
    public void testUpdateById(){
        User user = userMapper.selectById(6);
        user.setName("lisi");
        userMapper.updateById(user);
    }
}