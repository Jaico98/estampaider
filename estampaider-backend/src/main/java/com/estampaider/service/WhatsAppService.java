package com.estampaider.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class WhatsAppService {

    @Value("${whatsapp.access.token:}")
    private String accessToken;

    @Value("${whatsapp.phone.number.id:}")
    private String phoneNumberId;

    private final RestTemplate restTemplate = new RestTemplate();

    public void enviarMensaje(String numero, String mensaje) {
        enviarTexto(numero, mensaje);
    }

    public void enviarMensajeTexto(String numero, String mensaje) {
        enviarTexto(numero, mensaje);
    }

    public void enviarCodigoRecuperacion(String numero, String codigo) {
        String mensaje = "Tu código de recuperación de Estampaider es: " + codigo
                + ". Expira en 5 minutos. No lo compartas.";
        enviarTexto(numero, mensaje);
    }

    private void enviarTexto(String numero, String mensaje) {
        if (numero == null || numero.isBlank()) {
            throw new IllegalArgumentException("El numero de WhatsApp es obligatorio");
        }

        if (mensaje == null || mensaje.isBlank()) {
            throw new IllegalArgumentException("El mensaje no puede estar vacio");
        }

        if (accessToken == null || accessToken.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
            throw new IllegalStateException("Faltan las propiedades whatsapp.access.token o whatsapp.phone.number.id");
        }

        String numeroNormalizado = normalizarNumero(numero);
        String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> text = new HashMap<>();
        text.put("body", mensaje);

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", numeroNormalizado);
        body.put("type", "text");
        body.put("text", text);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        System.out.println("=== WhatsApp DEBUG ===");
        System.out.println("Phone Number ID: " + phoneNumberId);
        System.out.println("Numero original: " + numero);
        System.out.println("Numero normalizado: " + numeroNormalizado);
        System.out.println("Mensaje: " + mensaje);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);

        System.out.println("WhatsApp status: " + response.getStatusCode());
        System.out.println("WhatsApp body: " + response.getBody());

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Error enviando mensaje por WhatsApp: " + response.getBody());
        }
    }

    private String normalizarNumero(String numero) {
        String limpio = numero.replaceAll("[^\\d]", "");

        if (limpio.startsWith("0")) {
            limpio = limpio.substring(1);
        }

        if (!limpio.startsWith("57") && limpio.length() == 10) {
            limpio = "57" + limpio;
        }

        return limpio;
    }
}
