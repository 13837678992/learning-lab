package com.du.lease.common.mybatisplus;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Date;

@Component
public class MybatisMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        System.out.println(LocalDateTime.now());
        this.strictInsertFill(metaObject, "createTime", Date.class, new Date());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime",  Date.class, new Date());
    }

    public static void main(String[] args) {
        System.out.println(LocalDateTime.now());
    }
}