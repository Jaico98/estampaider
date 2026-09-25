package com.estampaider.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@Service
public class WhatsAppService {

    private static final Logger LOGGER = LoggerFactory.getLogger(WhatsAppService.class);

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
            throw new IllegalArgumentException("El número de WhatsApp es obligatorio");
        }

        if (mensaje == null || mensaje.isBlank()) {
            throw new IllegalArgumentException("El mensaje no puede estar vacío");
        }

        if (accessToken == null || accessToken.isBlank() || "CHANGE_ME_DEV".equalsIgnoreCase(accessToken)) {
            throw new IllegalStateException("Falta configurar un whatsapp.access.token real");
        }

        if (phoneNumberId == null || phoneNumberId.isBlank() || "CHANGE_ME_DEV".equalsIgnoreCase(phoneNumberId)) {
            throw new IllegalStateException("Falta configurar un whatsapp.phone.number.id real");
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

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                LOGGER.warn("La API de WhatsApp rechazó una solicitud de envío con estado {}", response.getStatusCode());
                throw new RuntimeException("La API de WhatsApp rechazó la solicitud");
            }
        } catch (HttpStatusCodeException e) {
            LOGGER.warn("La API de WhatsApp rechazó una solicitud de envío con estado {}", e.getStatusCode());
            throw new RuntimeException("La API de WhatsApp rechazó la solicitud");
        } catch (Exception e) {
            LOGGER.warn("No fue posible completar una solicitud de envío a WhatsApp: {}", e.getClass().getSimpleName());
            throw new RuntimeException("No fue posible completar la solicitud a WhatsApp");
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
