package com.du.dao;

import com.du.pojo.User;
import com.du.utils.MybatisUtils;
import org.apache.ibatis.session.SqlSession;
import org.junit.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

public class userMapTest {
    private static final Logger logger = Logger.getLogger(String.valueOf(userMapTest.class));
    @Test
    public void test() {
        // Get SqlSession
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        // Get UserMap 执行SQL
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        for (User user : userMapper.getUserList()) {
            logger.info("User: " + user);
//            System.out.println(user);
        }
        // Close SqlSession
        sqlSession.close();


    }
    @Test
    public void getUserById() {
        // Get SqlSession
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        // Get UserMap 执行SQL
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        System.out.println(userMapper.getUserById(1));
        // Close SqlSession
        sqlSession.close();
    }
    @Test
    public void addUser() {
        // Get SqlSession
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        // Get UserMap 执行SQL
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        System.out.println(userMapper.addUser(new User(4, "Tom", "123456","zs4@sina.com","1980-12-05")));
        // Commit
        sqlSession.commit();
        // Close SqlSession
        sqlSession.close();
    }
    @Test
    public void addUserMap() {
        // Get SqlSession
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        // Get UserMap 执行SQL
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        Map<String, Object> map = new HashMap<String, Object>();
        map.put("userId", 5);
        map.put("userName", "Tom5");
        System.out.println(userMapper.addUserMap(map));
        // Commit
        sqlSession.commit();
        // Close SqlSession
        sqlSession.close();
    }
    @Test
    public void updateUser() {
        // Get SqlSession
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        // Get UserMap 执行SQL
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        System.out.println(userMapper.updateUser(new User(4, "Tom11", "123456", "new@sina.com", "1980-12-05")));
        // Commit
        sqlSession.commit();
        // Close SqlSession
        sqlSession.close();
    }
    @Test
    public void deleteUser() {
        // Get SqlSession
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        // Get UserMap 执行SQL
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        System.out.println(userMapper.deleteUser(4));
        // Commit
        sqlSession.commit();
        // Close SqlSession
        sqlSession.close();
    }

}
