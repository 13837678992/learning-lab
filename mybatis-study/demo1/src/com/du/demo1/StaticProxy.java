package com.du.demo1;

public class StaticProxy {
    public static void main(String[] args) {
        new WeddingCompany(new You()).happyMarry();
    }
}
interface Marry{
    void happyMarry();
}
class You implements Marry{
    @Override
    public void happyMarry() {
        System.out.println("you and dididi");
    }
}
class WeddingCompany implements Marry{
    private Marry target;
    public WeddingCompany(Marry target){
        this.target = target;
    }
    @Override
    public void happyMarry() {
        before();
        this.target.happyMarry();
        after();
    }
    private void before(){
        System.out.println("before");
    }
    private void after(){
        System.out.println("after");
    }
}
