package com.du.state;

public class TestState {
    public static void main(String[] args) {
        Thread thread = new Thread(()->{
            for (int i = 0; i < 5; i++) {
                System.out.println("thread running...");
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        });
        Thread.State state = thread.getState();
        System.out.println(state); // NEW
        thread.start();
        state = thread.getState();
        System.out.println(state); // RUNNABLE
        while(state != Thread.State.TIMED_WAITING){
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            state = thread.getState();
            System.out.println(state);
        }
        state = thread.getState();
        System.out.println(state); // TERMINATED

    }
}
