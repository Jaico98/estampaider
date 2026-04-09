package com.estampaider.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.Map;

@Service
public class WhatsAppService {

    @Value("${whatsapp.access.token}")
    private String accessToken;

    @Value("${whatsapp.phone.number.id}")
    private String phoneNumberId;

    public void enviarMensaje(String numero, String mensaje) {

        String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", numero,
                "type", "text",
                "text", Map.of("body", mensaje)
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        restTemplate.postForEntity(url, request, String.class);
    }
}