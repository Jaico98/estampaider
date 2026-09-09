package com.estampaider.config;

import com.estampaider.service.ChatPresenceService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketPresenceListener {

    private final ChatPresenceService presenceService;

    public WebSocketPresenceListener(ChatPresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @EventListener
    public void alConectar(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String tipo = accessor.getFirstNativeHeader("tipo");

        if (!"CLIENTE".equalsIgnoreCase(tipo)) {
            return;
        }

        presenceService.registrarConexion(
                accessor.getSessionId(),
                accessor.getFirstNativeHeader("telefono")
        );
    }

    @EventListener
    public void alDesconectar(SessionDisconnectEvent event) {
        presenceService.registrarDesconexion(event.getSessionId());
    }
}
