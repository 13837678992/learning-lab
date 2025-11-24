package com.du.dao;

import com.du.pojo.Student;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface StudentMapper {
    List<Student> getStudent(@Param("id") int id);
}
