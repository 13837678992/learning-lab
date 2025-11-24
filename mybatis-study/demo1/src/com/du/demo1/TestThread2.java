package com.du.demo1;

import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.net.URL;

public class TestThread2 implements Runnable{
    private String url;
    private String name;
    public  TestThread2(String url,String name){
        this.url = url;
        this.name= name;
    }
    public void run(){
        WebDownloader webDownloader = new WebDownloader();
        webDownloader.downloader(url,name);
        System.out.println("下载了文件名为："+name);
    }

    public static void main(String[] args) {
        TestThread2 t1 = new TestThread2("https://www.baidu.com/img/bd_logo1.png","baidu.png");
        TestThread2 t2 = new TestThread2("https://www.baidu.com/img/bd_logo1.png","baidu2.png");
        TestThread2 t3 = new TestThread2("https://www.baidu.com/img/bd_logo1.png","baidu3.png");
        new Thread(t1).start();
        new Thread(t2).start();
        new Thread(t3).start();
    }
}

class WebDownloader {
    public void downloader(String url,String name){
        try {
            FileUtils.copyURLToFile(new URL(url),new File(name));
        } catch (IOException e) {
            System.out.println("IO异常，downloader");
            throw new RuntimeException(e);
        }
    }
}