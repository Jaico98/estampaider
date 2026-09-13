package com.estampaider.controller;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.EstadoMensaje;
import com.estampaider.repository.ChatMensajeRepository;
import com.estampaider.repository.MensajeRepository;
import com.estampaider.service.ChatPresenceService;
import com.estampaider.service.ChatUsuarioService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private ChatMensajeRepository chatRepository;
    @Mock
    private MensajeRepository mensajeRepository;
    @Mock
    private ChatPresenceService presenceService;
    @Mock
    private ChatUsuarioService chatUsuarioService;

    @Test
    void lecturaDelAdminSoloMarcaMensajesDelCliente() {
        ChatMensaje mensajeCliente = mensaje("cliente-1", "CLIENTE");
        ChatMensaje mensajeAdmin = mensaje("admin-1", "ADMIN");
        when(chatRepository.findByTelefonoOrderByFechaAsc("573153625992"))
                .thenReturn(List.of(mensajeCliente, mensajeAdmin));

        ChatController controller = new ChatController(
                messagingTemplate,
                chatRepository,
                mensajeRepository,
                presenceService,
                chatUsuarioService
        );
        ChatMensaje solicitud = new ChatMensaje();
        solicitud.setTelefono("315 362 5992");
        solicitud.setTipo("ADMIN");

        controller.marcarLeido(solicitud);

        assertTrue(mensajeCliente.isLeido());
        assertTrue(mensajeCliente.isRecibido());
        assertFalse(mensajeAdmin.isLeido());
        verify(chatRepository).saveAll(List.of(mensajeCliente));

        ArgumentCaptor<EstadoMensaje> evento = ArgumentCaptor.forClass(EstadoMensaje.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/chat/573153625992"),
                evento.capture()
        );
        assertTrue(evento.getValue().getMensajeIds().contains("cliente-1"));
        assertFalse(evento.getValue().getMensajeIds().contains("admin-1"));
    }

    private ChatMensaje mensaje(String id, String tipo) {
        ChatMensaje mensaje = new ChatMensaje();
        mensaje.setId(id);
        mensaje.setTipo(tipo);
        mensaje.setTelefono("573153625992");
        mensaje.setMensaje("Prueba");
        return mensaje;
    }
}
