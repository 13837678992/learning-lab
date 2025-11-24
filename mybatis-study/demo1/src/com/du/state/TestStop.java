package com.du.state;

public class TestStop  implements Runnable{

    public  void run(){
        int i = 0;
        while(flag){
            System.out.println("run....Thread" + i++);
        }
    }
    //1.设置一个标志位
    private boolean flag = true;
    public void stop(){
        this.flag = false;
    }


    public static void main(String[] args) {
        TestStop stop = new TestStop();
        new Thread(stop).start();
        for (int i = 0; i < 10000; i++) {
            if (i == 9000) {
                stop.stop();
                System.out.println("线程该停止了");
            }
        }

    }
}
