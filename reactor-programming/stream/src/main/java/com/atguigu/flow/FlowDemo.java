package com.atguigu.flow;

import java.util.concurrent.Flow;
import java.util.concurrent.SubmissionPublisher;

public class FlowDemo {



    static class MyProcessor extends SubmissionPublisher<String> implements Flow.Subscriber<String> {
        private Flow.Subscription subscription;
        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            System.out.println("process订阅");
            this.subscription = subscription;
            subscription.request(1);

        }

        @Override
        public void onNext(String item) {
            System.out.println("processor拿到数据"  + item);
            item += "weicheng";
            submit(item);
            subscription.request(1);


        }

        @Override
        public void onError(Throwable throwable) {

        }

        @Override
        public void onComplete() {

        }
    }
    public static void main(String[] args) {
        // 1. 发布者
        SubmissionPublisher<String> publisher = new SubmissionPublisher<>();
        MyProcessor myProcessor = new MyProcessor();
        // 2. 订阅者
        Flow.Subscriber<String> subscriber = new Flow.Subscriber<String>() {
            private Flow.Subscription subscription;
            private Boolean cancelled = false;
            @Override
            public void onSubscribe(Flow.Subscription subscription) {
                System.out.println(Thread.currentThread().getName() + ": onSubscribe"+subscription.toString());
                this.subscription = subscription;
                subscription.request(1);
            }

            @Override
            public void onNext(String item) {
                if (cancelled) {
                    return;
                }
                System.out.println("onNext: "+item);

                if (item.equals("6")){
                    System.out.println(item+ "111");
                    subscription.cancel();
                    cancelled = true;
                }
                subscription.request(1);
            }

            @Override
            public void onError(Throwable throwable) {
                System.out.println("onError: "+throwable.getMessage());
            }

            @Override
            public void onComplete() {
                System.out.println("onComplete");

            }
        };
        // 3. 绑定

        publisher.subscribe(myProcessor);
        myProcessor.subscribe(subscriber);
        for (int i = 0; i < 10; i++) {
            publisher.submit(String.valueOf(i));
        }


        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
        // 4. 关闭
        publisher.close();
    }
}