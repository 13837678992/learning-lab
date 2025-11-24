package com.du.reflection;

public class Test07 {
    public static void main(String[] args) throws ClassNotFoundException {
        ClassLoader systemClassLoader = ClassLoader.getSystemClassLoader();
        System.out.println(systemClassLoader);
        ClassLoader parent = systemClassLoader.getParent();
        System.out.println(parent);
        ClassLoader parent1 = parent.getParent();
        System.out.println(parent1);


        ClassLoader classLoader = Class.forName("com.du.reflection.Test07").getClassLoader();
        System.out.println(classLoader);

        ClassLoader classLoader1 = Class.forName("java.lang.Object").getClassLoader();
        System.out.println(classLoader1);
        System.out.println(System.getProperty("java.class.path"));
        /**
         * /Users/duzhiheng/Downloads/java/demo1/out/production/untitled
         * :/Users/duzhiheng/Downloads/java/demo1/src/com/lib/commons-io-2.16.1.jar
         */

    }
}
