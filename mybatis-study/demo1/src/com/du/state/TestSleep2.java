package com.du.state;

import java.text.SimpleDateFormat;
import java.util.Date;

public class TestSleep2 {
    public static void main(String[] args) {
        Date startTime = null;
        int num = 10;
        while (true){
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            startTime = new Date(System.currentTimeMillis());
            System.out.println(new SimpleDateFormat("HH:mm:ss").format(startTime));
//            System.out.println(num--);
            if(num <= 0){
                break;
            }
        }
//        tenDown();
    }
    public static void tenDown(){
        int num = 10;
        while (true){
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            System.out.println(num--);
            if(num <= 0){
                break;
            }
        }
    }
}
