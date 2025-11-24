package com.du.reflection;
import java.lang.reflect.Field;
public class Test08 {
    public static void main(String[] args) throws ClassNotFoundException {
        Class c1 = Class.forName("com.du.reflection.User");
        Field[] fields = c1.getDeclaredFields();
        for (Field field : fields) System.out.println(field);
    }
}
