package com.du.pojo;

import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.util.Date;

@Data
@Alias("blog")
public class Blog {
    private String id;
    private String title;
    private String author;
    private Date createTime;
    private int views;
}
