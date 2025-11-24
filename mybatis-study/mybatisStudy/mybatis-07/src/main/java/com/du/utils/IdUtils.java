package com.du.utils;

import org.junit.jupiter.api.Test;

import java.util.UUID;

public class IdUtils {
    public static String getId(){
        return UUID.randomUUID().toString().replaceAll("-","");
    }
    @Test
    public void test(){
        System.out.println(IdUtils.getId());
    }
}
