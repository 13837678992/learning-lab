package com.du.helloredis;

import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;

@SpringBootTest
class TestRedisTemplate {
    @Resource
    private RedisTemplate<String, Object> redisTemplate;
    @Test
    public void testSet() {
        redisTemplate.opsForValue().set("key", "value");
    }

    @Test
    public void testGet() {
        String key = (String)redisTemplate.opsForValue().get("key");
        System.out.println(key);
    }


    @Test
    public void testDel() {
        redisTemplate.delete("key");
    }




}
