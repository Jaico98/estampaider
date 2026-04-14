package com.estampaider.controller;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.EstadoMensaje;
import com.estampaider.model.Mensaje;
import com.estampaider.repository.ChatMensajeRepository;
import com.estampaider.repository.MensajeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@RestController
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMensajeRepository repo;
    private final MensajeRepository mensajeRepository;

    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            ChatMensajeRepository repo,
            MensajeRepository mensajeRepository
    ) {
        this.messagingTemplate = messagingTemplate;
        this.repo = repo;
        this.mensajeRepository = mensajeRepository;
    }

    @MessageMapping("/chat")
    public void enviarMensaje(@Payload ChatMensaje mensaje) {
        final String telefono = normalizarTelefono(mensaje.getTelefono());

        mensaje.setTelefono(telefono);

        if (mensaje.getTipo() == null || mensaje.getTipo().isBlank()) {
            mensaje.setTipo("CLIENTE");
        }

        if (mensaje.getId() == null || mensaje.getId().isBlank()) {
            mensaje.setId(UUID.randomUUID().toString());
        }

        if (mensaje.getFecha() == null) {
            mensaje.setFecha(Instant.now());
        }

        if (mensaje.getNombre() == null || mensaje.getNombre().isBlank()) {
            mensaje.setNombre("Cliente");
        }

        repo.save(mensaje);

        // Mantener sincronizada la bandeja del admin
        sincronizarBandejaAdmin(mensaje);

        messagingTemplate.convertAndSend("/topic/chat/" + telefono, mensaje);
        messagingTemplate.convertAndSend("/topic/chat/global", mensaje);
    }

    @MessageMapping("/chat/leido")
    public void marcarLeido(@Payload String telefonoPayload) {
        final String telefono = normalizarTelefono(telefonoPayload);

        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefono);
        mensajes.forEach(m -> m.setLeido(true));
        repo.saveAll(mensajes);

        messagingTemplate.convertAndSend(
                "/topic/chat/" + telefono,
                new EstadoMensaje("LEIDO", telefono)
        );
    }

    @MessageMapping("/chat/typing")
    public void escribiendo(@Payload ChatMensaje mensaje) {
        final String telefono = normalizarTelefono(mensaje.getTelefono());
        final String tipo = (mensaje.getTipo() == null || mensaje.getTipo().isBlank())
                ? "CLIENTE"
                : mensaje.getTipo();

        messagingTemplate.convertAndSend(
                "/topic/chat/" + telefono + "/typing",
                new EstadoMensaje(tipo, telefono)
        );
    }

    @MessageMapping("/chat/recibido")
    public void marcarRecibido(@Payload String telefonoPayload) {
        final String telefono = normalizarTelefono(telefonoPayload);

        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefono);
        mensajes.stream()
                .filter(m -> !m.isLeido())
                .forEach(m -> m.setRecibido(true));

        repo.saveAll(mensajes);

        messagingTemplate.convertAndSend(
                "/topic/chat/" + telefono,
                new EstadoMensaje("RECIBIDO", telefono)
        );
    }

    @MessageMapping("/chat/online")
    public void usuarioOnline(@Payload String telefonoPayload) {
        final String telefono = normalizarTelefono(telefonoPayload);
        messagingTemplate.convertAndSend("/topic/online/" + telefono, "ONLINE");
    }

    @GetMapping("/api/chat/{telefono}")
    public List<ChatMensaje> obtenerChat(@PathVariable String telefono) {
        return repo.findByTelefonoOrderByFechaAsc(normalizarTelefono(telefono));
    }

    @DeleteMapping("/api/chat/{telefono}")
    public ResponseEntity<Void> eliminarChatPorTelefono(@PathVariable String telefono) {
        String telefonoNormalizado = normalizarTelefono(telefono);

        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefonoNormalizado);
        if (!mensajes.isEmpty()) {
            repo.deleteAll(mensajes);
        }

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/chat/mensaje/{id}")
    public ResponseEntity<Void> eliminarMensajePorId(@PathVariable String id) {
        repo.findById(id).ifPresent(repo::delete);
        return ResponseEntity.noContent().build();
    }

    private void sincronizarBandejaAdmin(ChatMensaje chatMensaje) {
        String telefono = normalizarTelefono(chatMensaje.getTelefono());
        if (telefono.isBlank()) {
            return;
        }

        LocalDateTime fecha = LocalDateTime.ofInstant(
                chatMensaje.getFecha() != null ? chatMensaje.getFecha() : Instant.now(),
                ZoneId.systemDefault()
        );

        Mensaje registro = mensajeRepository
                .findFirstByWhatsappOrderByFechaDesc(telefono)
                .orElseGet(Mensaje::new);

        if (registro.getNombre() == null || registro.getNombre().isBlank()) {
            registro.setNombre(
                    chatMensaje.getNombre() != null && !chatMensaje.getNombre().isBlank()
                            ? chatMensaje.getNombre()
                            : "Cliente"
            );
        } else if ("CLIENTE".equalsIgnoreCase(chatMensaje.getTipo())
                && chatMensaje.getNombre() != null
                && !chatMensaje.getNombre().isBlank()) {
            registro.setNombre(chatMensaje.getNombre());
        }

        if (registro.getCorreo() == null) {
            registro.setCorreo("");
        }

        registro.setWhatsapp(telefono);
        registro.setMensaje(chatMensaje.getMensaje());
        registro.setFecha(fecha);

        // Si escribe el cliente, debe aparecer como no leído en el panel admin
        if ("CLIENTE".equalsIgnoreCase(chatMensaje.getTipo())) {
            registro.setLeido(false);
        }

        mensajeRepository.save(registro);

        // Empujar actualización en tiempo real a la bandeja admin
        messagingTemplate.convertAndSend(
                "/topic/mensajes",
                new MensajeController.AdminMensajeResponse(registro)
        );
    }

    private String normalizarTelefono(String telefono) {
        if (telefono == null) {
            return "";
        }

        String limpio = telefono
                .replace("\"", "")
                .replace("+", "")
                .replaceAll("\\D", "")
                .trim();

        if (limpio.isBlank()) {
            return "";
        }

        return limpio.startsWith("57") ? limpio : "57" + limpio;
    }
}