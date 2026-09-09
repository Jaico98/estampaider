package com.estampaider.service;

import com.estampaider.model.EstadoMensaje;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChatPresenceService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ConcurrentMap<String, Set<String>> sesionesPorTelefono = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> telefonoPorSesion = new ConcurrentHashMap<>();

    public ChatPresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void registrarConexion(String sessionId, String telefono) {
        String telefonoNormalizado = normalizarTelefono(telefono);
        if (sessionId == null || sessionId.isBlank() || telefonoNormalizado.isBlank()) {
            return;
        }

        String telefonoAnterior = telefonoPorSesion.put(sessionId, telefonoNormalizado);
        if (telefonoAnterior != null && !telefonoAnterior.equals(telefonoNormalizado)) {
            retirarSesion(telefonoAnterior, sessionId);
        }

        Set<String> sesiones = sesionesPorTelefono.computeIfAbsent(
                telefonoNormalizado,
                ignored -> ConcurrentHashMap.newKeySet()
        );
        boolean primeraConexion = sesiones.isEmpty();
        boolean conexionNueva = sesiones.add(sessionId);

        if (primeraConexion && conexionNueva) {
            publicarEstado("ONLINE", telefonoNormalizado);
        }
    }

    public void registrarDesconexion(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }

        String telefono = telefonoPorSesion.remove(sessionId);
        if (telefono != null) {
            retirarSesion(telefono, sessionId);
        }
    }

    public boolean estaEnLinea(String telefono) {
        Set<String> sesiones = sesionesPorTelefono.get(normalizarTelefono(telefono));
        return sesiones != null && !sesiones.isEmpty();
    }

    public String normalizarTelefono(String telefono) {
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

    private void retirarSesion(String telefono, String sessionId) {
        Set<String> sesiones = sesionesPorTelefono.get(telefono);
        if (sesiones == null) {
            return;
        }

        sesiones.remove(sessionId);
        if (sesiones.isEmpty() && sesionesPorTelefono.remove(telefono, sesiones)) {
            publicarEstado("OFFLINE", telefono);
        }
    }

    private void publicarEstado(String tipo, String telefono) {
        messagingTemplate.convertAndSend(
                "/topic/online/" + telefono,
                new EstadoMensaje(tipo, telefono, "CLIENTE", Instant.now(), Set.of())
        );
    }
}
