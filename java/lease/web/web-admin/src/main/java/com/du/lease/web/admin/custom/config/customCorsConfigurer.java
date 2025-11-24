package com.du.lease.web.admin.custom.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class customCorsConfigurer  {

    @Bean
    public WebMvcConfigurer CorsConfigurer() {
        return new WebMvcConfigurer() {

            @Override
            public void addCorsMappings(CorsRegistry registry) {
                System.out.println("CorsConfigurer");
                registry.addMapping("/**")  // 应用于所有URL
//                        .allowedOrigins("http://100.123.64.109","http://100.71.149.5","http://localhost")    // 允许所有域名访问
                        .allowedOrigins("*")    // 允许所有域名访问
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("Content-Type", "Authorization", "Access-Token");
            }
        };
    }
}
