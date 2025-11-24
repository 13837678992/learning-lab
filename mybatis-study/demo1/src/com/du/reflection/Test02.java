package com.du.reflection;

public class Test02 {
    public static void main(String[] args) {

        Class c1 = Object.class;
        Class c2 = Comparable.class;
        Class c3 = String[].class;
        Class c4 = int[][].class;
        Class c6 = void.class;
        Class c7 = Class.class;
        Class c9 = int.class;
        Class c10 = Integer.class;
        Class c11 = Override.class;
        System.out.println(c1);
        System.out.println(c2);
        System.out.println(c3);
        System.out.println(c4);
        System.out.println(c6);
        System.out.println(c7);
        System.out.println(c9);
        System.out.println(c10);
        System.out.println(c11);

        int[] a = new int[10];
        int[] b = new int[100];
        System.out.println(a.getClass().hashCode());
        System.out.println(b.getClass().hashCode());

    }
}
