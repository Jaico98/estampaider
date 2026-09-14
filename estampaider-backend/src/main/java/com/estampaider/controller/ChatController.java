package com.estampaider.controller;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.EstadoMensaje;
import com.estampaider.model.Mensaje;
import com.estampaider.repository.ChatMensajeRepository;
import com.estampaider.repository.MensajeRepository;
import com.estampaider.service.ChatPresenceService;
import com.estampaider.service.ChatUsuarioService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMensajeRepository repo;
    private final MensajeRepository mensajeRepository;
    private final ChatPresenceService presenceService;
    private final ChatUsuarioService chatUsuarioService;

    public ChatController(
            SimpMessagingTemplate messagingTemplate,
            ChatMensajeRepository repo,
            MensajeRepository mensajeRepository,
            ChatPresenceService presenceService,
            ChatUsuarioService chatUsuarioService
    ) {
        this.messagingTemplate = messagingTemplate;
        this.repo = repo;
        this.mensajeRepository = mensajeRepository;
        this.presenceService = presenceService;
        this.chatUsuarioService = chatUsuarioService;
    }

    @MessageMapping("/chat")
    public void enviarMensaje(@Payload ChatMensaje mensaje) {
        final String telefono = normalizarTelefono(mensaje.getTelefono());
        mensaje.setTelefono(telefono);

        String tipo = normalizarActor(mensaje.getTipo());
        mensaje.setTipo(tipo.isBlank() ? "CLIENTE" : tipo);

        if (mensaje.getId() == null || mensaje.getId().isBlank()) {
            mensaje.setId(UUID.randomUUID().toString());
        }

        if (mensaje.getFecha() == null) {
            mensaje.setFecha(Instant.now());
        }

        if (mensaje.getNombre() == null || mensaje.getNombre().isBlank()) {
            mensaje.setNombre("Cliente");
        }

        mensaje.setLeido(false);
        mensaje.setRecibido(false);

        chatUsuarioService.asociarCuenta(mensaje);
        repo.save(mensaje);
        sincronizarBandejaAdmin(mensaje);

        messagingTemplate.convertAndSend("/topic/chat/" + telefono, mensaje);
        messagingTemplate.convertAndSend("/topic/chat/global", mensaje);
    }

    @MessageMapping("/chat/leido")
    public void marcarLeido(@Payload ChatMensaje solicitud) {
        final String telefono = normalizarTelefono(solicitud.getTelefono());
        final String lector = normalizarActor(solicitud.getTipo());
        final String emisor = actorOpuesto(lector);
        if (telefono.isBlank() || emisor.isBlank()) {
            return;
        }

        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefono);
        List<ChatMensaje> actualizados = mensajes.stream()
                .filter(m -> emisor.equalsIgnoreCase(m.getTipo()) && !m.isLeido())
                .peek(m -> {
                    m.setRecibido(true);
                    m.setLeido(true);
                })
                .toList();

        if (actualizados.isEmpty()) {
            return;
        }

        repo.saveAll(actualizados);
        List<String> ids = actualizados.stream().map(ChatMensaje::getId).toList();

        if ("ADMIN".equals(lector)) {
            marcarBandejaComoLeida(telefono);
        }

        messagingTemplate.convertAndSend(
                "/topic/chat/" + telefono,
                new EstadoMensaje("LEIDO", telefono, lector, Instant.now(), ids)
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
    public void marcarRecibido(@Payload ChatMensaje solicitud) {
        final String telefono = normalizarTelefono(solicitud.getTelefono());
        final String receptor = normalizarActor(solicitud.getTipo());
        final String emisor = actorOpuesto(receptor);
        if (telefono.isBlank() || emisor.isBlank()) {
            return;
        }

        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefono);
        List<ChatMensaje> actualizados = mensajes.stream()
                .filter(m -> emisor.equalsIgnoreCase(m.getTipo()) && !m.isRecibido())
                .peek(m -> m.setRecibido(true))
                .toList();

        if (actualizados.isEmpty()) {
            return;
        }

        repo.saveAll(actualizados);
        List<String> ids = actualizados.stream().map(ChatMensaje::getId).toList();

        messagingTemplate.convertAndSend(
                "/topic/chat/" + telefono,
                new EstadoMensaje("RECIBIDO", telefono, receptor, Instant.now(), ids)
        );
    }

    @GetMapping("/{telefono}")
    public ResponseEntity<?> obtenerChatPorTelefono(
            @PathVariable String telefono,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("No autenticado");
        }

        String usuarioActual = authentication.getName();

        boolean esAdmin = authentication.getAuthorities()
                .stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        String telefonoNormalizado = normalizarTelefono(telefono);
        String usuarioNormalizado = esAdmin
                ? usuarioActual
                : normalizarTelefono(usuarioActual);

        if (!esAdmin && !telefonoNormalizado.equals(usuarioNormalizado)) {
            return ResponseEntity.status(403).body("No autorizado para ver este chat");
        }

        return ResponseEntity.ok(repo.findByTelefonoOrderByFechaAsc(telefonoNormalizado));
    }

    @GetMapping("/{telefono}/presencia")
    public ResponseEntity<?> obtenerPresencia(
            @PathVariable String telefono,
            Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body("No autenticado");
        }

        String telefonoNormalizado = normalizarTelefono(telefono);
        boolean esAdmin = authentication.getAuthorities()
                .stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!esAdmin && !telefonoNormalizado.equals(normalizarTelefono(authentication.getName()))) {
            return ResponseEntity.status(403).body("No autorizado para consultar esta presencia");
        }

        return ResponseEntity.ok(Map.of(
                "telefono", telefonoNormalizado,
                "online", presenceService.estaEnLinea(telefonoNormalizado)
        ));
    }

    @DeleteMapping("/{telefono}")
    public ResponseEntity<?> eliminarChatPorTelefono(@PathVariable String telefono) {
        String telefonoNormalizado = normalizarTelefono(telefono);
        List<ChatMensaje> mensajes = repo.findByTelefonoOrderByFechaAsc(telefonoNormalizado);

        if (!mensajes.isEmpty()) {
            repo.deleteAll(mensajes);
        }

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/mensaje/{id}")
    public ResponseEntity<?> eliminarMensajePorId(@PathVariable String id) {
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

        if (chatMensaje.getCorreo() != null && !chatMensaje.getCorreo().isBlank()) {
            registro.setCorreo(chatMensaje.getCorreo().trim());
        } else if (registro.getCorreo() == null || registro.getCorreo().isBlank()) {
            registro.setCorreo("chat@estampaider.local");
        }

        registro.setWhatsapp(telefono);
        registro.setMensaje(chatMensaje.getMensaje());
        registro.setFecha(fecha);

        if ("CLIENTE".equalsIgnoreCase(chatMensaje.getTipo())) {
            registro.setLeido(false);
        }

        mensajeRepository.save(registro);

        messagingTemplate.convertAndSend(
                "/topic/mensajes",
                new MensajeController.AdminMensajeResponse(registro)
        );
    }

    private void marcarBandejaComoLeida(String telefono) {
        mensajeRepository.findFirstByWhatsappOrderByFechaDesc(telefono).ifPresent(registro -> {
            if (!registro.isLeido()) {
                registro.setLeido(true);
                mensajeRepository.save(registro);
                messagingTemplate.convertAndSend(
                        "/topic/mensajes",
                        new MensajeController.AdminMensajeResponse(registro)
                );
            }
        });
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

    private String normalizarActor(String actor) {
        String valor = actor == null ? "" : actor.trim().toUpperCase();
        return valor.equals("CLIENTE") || valor.equals("ADMIN") ? valor : "";
    }

    private String actorOpuesto(String actor) {
        if ("CLIENTE".equals(actor)) return "ADMIN";
        if ("ADMIN".equals(actor)) return "CLIENTE";
        return "";
    }
}
