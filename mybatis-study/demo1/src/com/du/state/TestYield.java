package com.du.state;

public class TestYield {

}

class MyYield implements Runnable{
    @Override
    public void run(){
        System.out.println(Thread.currentThread().getName() + "线程开始执行");
        Thread.yield();
        System.out.println(Thread.currentThread().getName() + "线程停止执行");
    }

}
