package com.du.reflection;

public class Test01 {
    public static void main(String[] args) {
        try {
            Class c1 = Class.forName("com.du.reflection.User");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }


    }
}
class User{
    private String name;
    private int age;
    private int id;

    public User() {
    }


    public User(String name, int age, int id) {
        this.name = name;
        this.age = age;
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }

    public int getId() {
        return id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public void setId(int id) {
        this.id = id;
    }
    @Override
    public String toString() {
        return "User{name='" + name + "', age=" + age + "}";
    }
}
