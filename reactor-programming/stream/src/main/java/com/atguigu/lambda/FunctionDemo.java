package com.atguigu.lambda;

import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

public class FunctionDemo {
    public static void main(String[] args) {
        extracted((i)->i.matches("-?\\d+(\\.\\d+)?"), () ->"42", System.out::println, Integer::parseInt);
    }
    public static void aaa(String[] args) {
        // 生产者
        Supplier<String> supplier = () -> {
            return "42";
        };
        System.out.println(supplier.get());
        // 断言：数字
        Predicate<String> predicate = (i) ->  i.matches("-?\\d+(\\.\\d+)?");
        System.out.println(predicate.test("42"));
        // 转换器 string -> int
        Function<String, Integer> function = Integer::parseInt;
        // 消费者
        Consumer<Integer> consumer = System.out::println;
        consumer.accept(function.apply("42"));

        extracted(predicate, supplier, consumer, function);


    }

    private static void extracted(Predicate<String> predicate, Supplier<String> supplier, Consumer<Integer> consumer, Function<String, Integer> function) {
        if(predicate.test(supplier.get())) {
            consumer.accept(function.apply(supplier.get()));
        } else {
            System.out.println("输入不是一个数字");
        }
    }
}
