package com.du.syn;

public class DeadLockDemo {

    public static void main(String[] args) {
        final Object lock1 = new Object();
        final Object lock2 = new Object();

        Thread thread1 = new Thread(new Runnable() {
            public void run() {
                synchronized (lock1) {
                    System.out.println("线程1: 持有 lock1...");

                    try { Thread.sleep(100); } catch (InterruptedException ignore) {}

                    System.out.println("线程1: 正在尝试获取 lock2...");
                    synchronized (lock2) {
                        System.out.println("线程1: 持有 lock1 和 lock2.");
                    }
                }
            }
        });

        Thread thread2 = new Thread(new Runnable() {
            public void run() {
                synchronized (lock2) {
                    System.out.println("线程2: 持有 lock2...");

                    try { Thread.sleep(100); } catch (InterruptedException ignore) {}

                    System.out.println("线程2: 正在尝试获取 lock1...");
                    synchronized (lock1) {
                        System.out.println("线程2: 持有 lock1 和 lock2.");
                    }
                }
            }
        });

        thread1.start();
        thread2.start();
    }
}
