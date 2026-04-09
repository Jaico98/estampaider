package com.estampaider;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Value;
import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class EstampaiderBackendApplication {

    @Value("${whatsapp.phone.number.id}")
    private String phoneNumberId;

    public static void main(String[] args) {
        SpringApplication.run(EstampaiderBackendApplication.class, args);
    }

    @PostConstruct
    public void mostrarConfig() {
        System.out.println("PHONE NUMBER ID: " + phoneNumberId);
    }
}