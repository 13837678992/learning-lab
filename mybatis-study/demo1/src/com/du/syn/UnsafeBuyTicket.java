package com.du.syn;

public class UnsafeBuyTicket {
    public static void main(String[] args) {
        BuyTicket buyTicket = new BuyTicket();
        new Thread(buyTicket, "小明").start();
        new Thread(buyTicket, "老师").start();
        new Thread(buyTicket, "黄牛").start();

    }
}
class BuyTicket implements Runnable{
    private int ticketNums = 20;
    boolean flag = true;
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
    private synchronized void buy()  {
        if (ticketNums <= 0){
            flag = false;
            return;
        }
//        Thread.sleep(100);
        System.out.println(Thread.currentThread().getName() + "拿到" + ticketNums--);
    }
    public void  stop(){
        flag = false;
    }
}