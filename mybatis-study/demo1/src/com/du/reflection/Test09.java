package com.du.reflection;

import java.lang.reflect.InvocationTargetException;

public class Test09 {
    public static void main(String[] args) throws ClassNotFoundException, NoSuchMethodException, InvocationTargetException, InstantiationException, IllegalAccessException {
        Class c1 = Class.forName("com.du.reflection.User");
        User user = (User) c1.getConstructor().newInstance();
        System.out.println(user);
        User weiCheng = (User)c1.getDeclaredConstructor(String.class, int.class, int.class).newInstance("weicheng", 18, 11);
        System.out.println(weiCheng);
        c1.getDeclaredMethod("setName", String.class).invoke(weiCheng, "du");
        System.out.println(weiCheng.getName());
    }
}
