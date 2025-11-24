package com.atguigu.lambda;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class StreamDemo {
    @NoArgsConstructor
    @AllArgsConstructor
    @Data
    static class Person{
        private String name;
        private String gender;
        private Integer age;
    }

    public static void main(String[] args) {
        List<Person> list = List.of(
                new Person("张三","男",11),
                new Person("李四","女",18),
                new Person("王五","男",33),
                new Person("六七","女",24),
                new Person("赵琪","男",7)
        );

        Map<String, List<Person>> collect = list.stream().filter(p -> p.age > 15).collect(Collectors.groupingBy(Person::getGender));
        System.out.println(collect);
    }
    public static void main111(String[] args) {
        List<Person> list = List.of(
                new Person("张三","男",11),
                new Person("李四","女",18),
                new Person("王五","男",33),
                new Person("六七","女",24),
                new Person("赵琪","男",7)
        );

        list.stream()
                .filter(per-> per.age > 18)
                .flatMap(p -> {
                    return Arrays.stream(p.getName().split(""));
                })
                .forEach(System.out::println);
    }
    public static void aaa(String[] args) {
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
