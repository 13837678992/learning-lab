package com.atguigu.lambda;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

public class StreamDemo {
    public static void main(String[] args) {
        List<Integer> names =  List.of(1, 3, 4, 5, 6, 7, 8, 9, 10);
        names.stream().filter((i) -> i % 2 == 0).max(Integer::compareTo).ifPresent(System.out::println);

        Map<Object,Object> of = Map.of("a", 1, "b", 2, "c", 3);
        of.keySet().stream();
        of.values().stream();
        System.out.println("主线程" + Thread.currentThread().getName());

        long count =  Stream.of(1, 2, 3, 4, 5)
                .filter(i -> (i > 2) )
                .count();
        System.out.println(count);
    }

}
