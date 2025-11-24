package com.du.state;

public class TestJoin implements Runnable{
    @Override
    public void run() {
        for (int i = 0; i < 100; i++) {
            System.out.println("VIP来了" + i);
        }
    }

    public static void main(String[] args) throws InterruptedException {
        for (int i = 0; i < 200; i++) {
            if (i == 50){
                TestJoin testJoin = new TestJoin();
                Thread thread = new Thread(testJoin);
                thread.start();
                thread.join();

            }
            System.out.println("main" + i);
        }
    }
}
