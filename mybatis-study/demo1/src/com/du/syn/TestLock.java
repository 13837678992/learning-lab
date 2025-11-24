package com.du.syn;

import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class TestLock {
    public static void main(String[] args) {
        TicketLock TicketLock = new TicketLock();
        new Thread(TicketLock, "小明").start();
        new Thread(TicketLock, "老师").start();
        new Thread(TicketLock, "黄牛").start();
    }
}
class TicketLock implements Runnable{
    private int ticketNums = 20;
    boolean flag = true;
    private final Lock lock = new ReentrantLock();
    @Override
    public void run() {
        while (flag){
            try {
                buy();
            } catch ( Exception e) {
                e.printStackTrace();
            }
        }
    }
    private void buy()  {
        lock.lock();

        try {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }

            System.out.println(Thread.currentThread().getName() + "拿到" + ticketNums--);
            if (ticketNums <= 0){
                flag = false;
                return;
            }
        } catch (RuntimeException e) {
            throw new RuntimeException(e);
        } finally {
            lock.unlock();
        }
    }
    public void  stop(){
        flag = false;
    }
}