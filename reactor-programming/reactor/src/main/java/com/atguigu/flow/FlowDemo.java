package com.atguigu.flow;

import org.reactivestreams.Subscription;
import reactor.core.publisher.BaseSubscriber;
import reactor.core.publisher.Flux;
import reactor.core.publisher.SignalType;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;


public class FlowDemo {
    public static void main(String[] args) {
        new FlowDemo().generate();
    }

    public void create(){

    }


    public void generate(){
//        AtomicInteger atomicInteger = new AtomicInteger();
//        Flux.generate(synchronousSink -> {
//            int i = atomicInteger.getAndIncrement();
//            if (i < 100){
//                synchronousSink.next("aaa"+i);
//            }else{
//                synchronousSink.complete();
//            }
//
//        })
//                .log()
//                .subscribe();
        Flux.generate(AtomicInteger::new,(state,sink)->{
            int i = state.getAndIncrement();
            sink.next("3 x " + i + " = " + 3*i);
            if (i == 10) sink.complete();
            return state;
        }, System.out::println).log()
                .subscribe();
    }
    public void limit(){
        Flux.range(1, 1000)
                .log()
                .limitRate(100,80)
                .subscribe();
    }

    public void buffer(){
        Flux.range(1, 10)
                .log()
                .buffer(3)
//                .log()
                .doOnNext((item)->{
                    System.out.println("----");
                })
                .subscribe(System.out::println);
    }

    public static void customSubscribe(String[] args) {
        Flux.range(1, 10)
                .map(i -> {
                    if(i == 6){
                        i = i/0;
                    }

                    return ("--" + i);
                })
                .onErrorComplete()
                .subscribe(System.out::println,throwable -> System.out.println("throwable = " + throwable));
    }
    public static void fluxMono(String[] args) {
        Flux.concat(Flux.range(1, 3), Flux.range(4, 3))
                .log()
                .filter(i -> i % 2 == 0)
                .map(i -> i * 2)
                .subscribe(System.out::println);
    }

    public static void flux1(String[] args) {
//        Mono<Integer> mono = Mono.just(1);
//        mono.subscribe(System.out::println);
        Flux<Integer> flux = Flux.range(1, 7)
                .delayElements(Duration.ofSeconds(1))// doOnXxxx hook 函数
                .doOnComplete(() -> {
                    System.out.println("done");
                })
                .doOnCancel(() -> {
                    System.out.println("cancelled");
                })
                .doOnError((error) -> {
                    System.out.println("error" + error);
                })
                .doOnNext((item) -> {
                    System.out.println("Next" + item);
                });
//        flux.subscribe(System.out::println);
        flux.subscribe(new BaseSubscriber<Integer>() {
            @Override
            protected void hookOnSubscribe(Subscription subscription) {
                System.out.println("Subscribed");
                request(1);
            }

            @Override
            protected void hookOnNext(Integer value) {
                System.out.println("Next" + value);
                request(1);
            }

            @Override
            protected void hookOnComplete() {
                System.out.println("Completed");
            }

            @Override
            protected void hookOnError(Throwable throwable) {
                System.out.println("error" + throwable);
            }

            @Override
            protected void hookOnCancel() {
                System.out.println("cancelled");
            }

            @Override
            protected void hookFinally(SignalType type) {
                System.out.println("finally");
            }
        });

        try {
            Thread.sleep(9000);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }


    }

    public static void flux(String[] args) {
        Flux<Integer> flow = Flux.just(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        flow.subscribe(System.out::println);
        System.out.println("========");
        Flux<Long> flux = Flux.interval(Duration.ofSeconds(1));
        flux.subscribe(System.out::println);
        try {
            Thread.sleep(10000); // 等待足够时间来观察异步流的输出
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

    }
}