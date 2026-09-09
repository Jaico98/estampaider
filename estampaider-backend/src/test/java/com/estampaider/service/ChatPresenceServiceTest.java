package com.estampaider.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import com.estampaider.model.EstadoMensaje;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class ChatPresenceServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void mantieneAlClienteEnLineaMientrasConserveAlgunaSesion() {
        ChatPresenceService service = new ChatPresenceService(messagingTemplate);

        service.registrarConexion("sesion-1", "315 362 5992");
        service.registrarConexion("sesion-2", "+57 315 362 5992");

        assertTrue(service.estaEnLinea("3153625992"));
        verify(messagingTemplate).convertAndSend(
                eq("/topic/online/573153625992"),
                any(EstadoMensaje.class)
        );

        service.registrarDesconexion("sesion-1");
        assertTrue(service.estaEnLinea("573153625992"));
        verifyNoMoreInteractions(messagingTemplate);

        service.registrarDesconexion("sesion-2");
        assertFalse(service.estaEnLinea("573153625992"));
        verify(messagingTemplate, times(2)).convertAndSend(
                eq("/topic/online/573153625992"),
                any(EstadoMensaje.class)
        );
    }

    @Test
    void ignoraConexionesSinTelefonoValido() {
        ChatPresenceService service = new ChatPresenceService(messagingTemplate);

        service.registrarConexion("sesion-1", "");

        assertFalse(service.estaEnLinea(""));
        verify(messagingTemplate, never()).convertAndSend(any(String.class), any(Object.class));
    }
}
