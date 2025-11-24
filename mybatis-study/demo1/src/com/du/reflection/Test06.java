package com.du.reflection;

public class Test06 {
    public static void main(String[] args) {
//        Son son = new Son();
        Son[] arr = new Son[5];


        System.out.println("------");

    }
}


class Father {
    static {
        System.out.println("Father类被加载");
    }
    public Father() {
        System.out.println("Father的构造方法被执行");
    }

}

class Son extends Father {
    static {
        System.out.println("Son类被加载");
    }
    public Son() {
        System.out.println("Son的构造方法被执行");
    }
}

