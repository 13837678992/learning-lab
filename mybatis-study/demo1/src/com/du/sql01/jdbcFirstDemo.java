package com.du.sql01;

public class jdbcFirstDemo {
    public static void main(String[] args) {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            String url = "jdbc:mysql://localhost:3306/jdbcStudy?useUnicode=true$characterEncoding=utf8&useSSL=true";
            String username = "root"
            String password = "root";
        } catch (ClassNotFoundException e) {
            throw new RuntimeException(e);
        }
    }
}
