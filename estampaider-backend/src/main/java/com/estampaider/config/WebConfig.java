package com.estampaider.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String rutaAbsoluta = Paths.get(uploadDir)
                .toAbsolutePath()
                .normalize()
                .toUri()
                .toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(rutaAbsoluta);
    }

    @Override
public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/uploads/**")
            .allowedOriginPatterns(
                    "http://localhost:5501",
                    "http://127.0.0.1:5501",
                    "http://localhost:*",
                    "http://127.0.0.1:*",
                    "https://estampaider.com",
                    "https://www.estampaider.com"
            )
            .allowedMethods("GET", "HEAD", "OPTIONS");
}
}