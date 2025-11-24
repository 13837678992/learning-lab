package com.du.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

public class Test01 {
        @MyAnnotation(age = 11 )
        public void test(){
            System.out.println("hello");
        }
}
@Target({ElementType.TYPE,ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@interface MyAnnotation{
        String value() default "hello";
        int age();
}
