package com.du.state;

import static java.lang.Thread.sleep;

public class TestPriority {
    public static void main(String[] args) {
        System.out.println( Thread.currentThread().getName()  + Thread.currentThread().getPriority());
        MyPriority myPriority = new MyPriority();
        Thread thread1 = new Thread(myPriority, "thread1");
        Thread thread2 = new Thread(myPriority, "thread2");
        Thread thread3 = new Thread(myPriority, "thread3");
        Thread thread4 = new Thread(myPriority, "thread4");
        thread1.setPriority(4);
        thread1.start();
        thread2.setPriority(6);

        thread2.start();
        thread3.setPriority(10);
        thread3.start();
        thread4.setPriority(1);
        thread4.start();
    }
}
class MyPriority implements Runnable{
    @Override
    public void run() {
        try {
            sleep(1000);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
        System.out.println(Thread.currentThread().getName() + Thread.currentThread().getPriority());
    }
}