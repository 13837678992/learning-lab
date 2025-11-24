package com.du.dao;

import com.du.pojo.User;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface UserMapper {
    @Select("select * from mybatis.users")
    List<User> getUsers();

}
