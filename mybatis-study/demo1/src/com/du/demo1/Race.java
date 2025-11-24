package com.du.demo1;

public class Race implements Runnable{
    private static String winner;
    @Override
    public void run() {
        for (int i = 0; i <= 100; i++) {
            if(Thread.currentThread().getName() == "兔子" && i%10 == 0){
                try {
                    Thread.sleep(1);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            if (winner != null){
                break;
            }
            System.out.println(Thread.currentThread().getName() + "-->跑了" + i + "步");
        }
        if (winner == null){
            winner = Thread.currentThread().getName();
            System.out.println("winner is " + winner);
        }
    }


    public static void main(String[] args) {
        new Thread(new Race(),"乌龟").start();
        new Thread(new Race(),"兔子").start();
    }
}
