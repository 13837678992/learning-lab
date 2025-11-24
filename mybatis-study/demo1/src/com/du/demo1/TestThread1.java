package com.du.demo1;

public class TestThread1 extends Thread{
    @Override
    public void run() {
        for (int i = 0; i < 200; i++) {
            System.out.println("thread1: " + i);
        }
    }
    public static void main(String[] args) {
        TestThread1 testThread1 = new TestThread1();
        testThread1.start();
//        testThread1.run();
        for (int i = 0; i < 200; i++) {
            System.out.println("zhu: " + i);
        }
    }
}
