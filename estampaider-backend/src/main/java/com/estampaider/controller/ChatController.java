package com.estampaider.controller;

import com.estampaider.model.ChatMensaje;
import com.estampaider.repository.ChatMensajeRepository;
import com.estampaider.model.EstadoMensaje;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@RestController
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMensajeRepository repo;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatMensajeRepository repo) {
        this.messagingTemplate = messagingTemplate;
        this.repo = repo;
    }

    @MessageMapping("/chat")
    public void enviarMensaje(ChatMensaje mensaje) {
    
        mensaje.setTelefono(mensaje.getTelefono().replace("+", "").trim());
    
        if (mensaje.getTipo() == null) {
            mensaje.setTipo("CLIENTE");
        }
    
        mensaje.setId(UUID.randomUUID().toString());
        mensaje.setFecha(Instant.now());
    
        repo.save(mensaje);
    
        // 🔥 ENVÍO CORRECTO DINÁMICO
        messagingTemplate.convertAndSend(
            "/topic/chat/" + mensaje.getTelefono(),
            mensaje
        );
    }

    @MessageMapping("/chat/leido")
public void marcarLeido(@Payload String telefono) {
        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefono);
    
        mensajes.forEach(m -> m.setLeido(true));
        repo.saveAll(mensajes);
    
        messagingTemplate.convertAndSend(
            "/topic/chat/" + telefono,
            new EstadoMensaje("LEIDO")
        );
    }

    @MessageMapping("/chat/typing")
public void escribiendo(ChatMensaje mensaje) {

    String tipo = mensaje.getTipo() != null ? mensaje.getTipo() : "CLIENTE";

    messagingTemplate.convertAndSend(
        "/topic/chat/" + mensaje.getTelefono() + "/typing",
        tipo
    );
}

@MessageMapping("/chat/recibido")
public void marcarRecibido(@Payload String telefono) {
    
        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefono);
    
        mensajes.stream()
            .filter(m -> !m.isLeido())
            .forEach(m -> m.setRecibido(true));
    
        repo.saveAll(mensajes);
    
        messagingTemplate.convertAndSend(
            "/topic/chat/" + telefono,
            new EstadoMensaje("RECIBIDO")
        );
    }

    @MessageMapping("/chat/online")
public void usuarioOnline(@Payload String telefono) {
        messagingTemplate.convertAndSend(
            "/topic/online/" + telefono,
            "ONLINE"
        );
    }    

    @GetMapping("/api/chat/{telefono}")
    public List<ChatMensaje> obtenerChat(@PathVariable String telefono) {
    telefono = telefono.replace("+", "").trim(); // 🔥 NORMALIZAR
    return repo.findByTelefonoOrderByFechaAsc(telefono);
}
}