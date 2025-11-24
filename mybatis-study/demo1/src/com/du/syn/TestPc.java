package com.du.syn;

public class TestPc {
    public static void main(String[] args) {
        SynContainer container = new SynContainer();
        new Thread(new Producer(container)).start();
        new Thread(new Consumer(container)).start();
    }
}
class Producer implements Runnable{
    SynContainer container;
    public Producer(SynContainer container){
        this.container = container;
    }
    @Override
    public void run() {
        for (int i = 0; i < 100; i++) {

            container.push(new Chicken(i));
//            System.out.println("生产了" + i + "只鸡");
        }
    }
}
class Consumer implements Runnable{
    SynContainer container;
    public Consumer(SynContainer container){
        this.container = container;
    }
    @Override
    public void run() {
        for (int i = 0; i < 100; i++) {
            container.pop();
//            System.out.println("消费了-->" + container.pop().id + "只鸡");
        }
    }
}
class Chicken{
    public int id;

    public Chicken(int id) {
        this.id = id;
    }
}

class SynContainer {
    Chicken[] chickens = new Chicken[10];
    int count = 0;

    public synchronized void push(Chicken chicken){
        if (count == chickens.length){
            try {
                this.wait();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        chickens[count] = chicken;
        count++;
        System.out.println("生产了" + count + "只鸡");
        this.notifyAll();
    }

    public synchronized Chicken pop(){
        if (count == 0){
            try {
                this.wait();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        System.out.println("消费了-->" + count + "只鸡");
        count--;
        Chicken chicken = chickens[count];
        this.notifyAll();
        return chicken;
    }
}
