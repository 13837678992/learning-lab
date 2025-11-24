package com.du.lease.web.admin.custom.config;

import com.du.lease.web.admin.custom.converter.StringToBaseEnumConverterFactory;
import com.du.lease.web.admin.custom.interceptor.AuthenticationInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfiguration implements WebMvcConfigurer {

    @Autowired
    private StringToBaseEnumConverterFactory StringToBaseEnumConverterFactory;
    @Autowired
    private AuthenticationInterceptor authenticationInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this.authenticationInterceptor).addPathPatterns("/admin/**").excludePathPatterns("/admin/login/**");
    }
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverterFactory(this.StringToBaseEnumConverterFactory);
    }
}