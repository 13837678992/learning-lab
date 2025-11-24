package com.du.dao;

import com.du.pojo.User;

import java.util.List;
import java.util.Map;

public interface UserMapper {
    List<User> getUserList();
    // Get user by id
    User getUserById(int id);
    // Insert a user
    int addUser(User user);
    // Inset a user map
    int addUserMap(Map<String, Object> map);
    // update a user
    int updateUser(User user);
    // delete a user
    int deleteUser(int id);
}
