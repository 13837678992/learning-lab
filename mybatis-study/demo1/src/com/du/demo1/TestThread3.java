package com.du.demo1;

public class TestThread3 implements Runnable{
    @Override
    public void run() {
        for (int i = 0; i < 200; i++) {
            System.out.println("thread3: " + i);
        }
    }
    public static void main(String[] args) {
        new Thread(new TestThread3()).start();
        for (int i = 0; i < 200; i++) {
            System.out.println("zhu: " + i);
        }
    }
}
