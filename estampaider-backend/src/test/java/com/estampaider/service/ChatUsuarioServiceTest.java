package com.estampaider.service;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatUsuarioServiceTest {
    private final UsuarioRepository repo = mock(UsuarioRepository.class);
    private final ChatUsuarioService service = new ChatUsuarioService(repo);

    @Test void asociaAlClienteYConservaElContratoDeLaRespuestaAdmin() throws Exception {
        Usuario cliente = new Usuario();
        ChatMensaje mensaje = new ChatMensaje();
        mensaje.setTelefono("+57 315 362 5992");
        mensaje.setTipo("ADMIN");
        when(repo.findAllByTelefonoIn(Set.of("573153625992", "3153625992")))
                .thenReturn(List.of(cliente));
        service.asociarCuenta(mensaje);
        assertSame(cliente, mensaje.getUsuario());
        assertEquals("ADMIN", mensaje.getTipo());
        var json = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(mensaje));
        assertFalse(json.has("usuario"), "No exponer la entidad Usuario ni sus credenciales al chat");
        assertEquals("+57 315 362 5992", json.get("telefono").asText());
    }

    @Test void buscaAmbasVariantesCuandoLlegaUnTelefonoNacional() {
        Usuario cliente = new Usuario();
        ChatMensaje mensaje = new ChatMensaje();
        mensaje.setTelefono("3153625992");
        when(repo.findAllByTelefonoIn(Set.of("3153625992", "573153625992")))
                .thenReturn(List.of(cliente));
        service.asociarCuenta(mensaje);
        assertSame(cliente, mensaje.getUsuario());
    }

    @Test void noAtribuyeHistorialACuentasAmbiguas() {
        ChatMensaje mensaje = new ChatMensaje();
        mensaje.setTelefono("573153625992");
        when(repo.findAllByTelefonoIn(any())).thenReturn(List.of(new Usuario(), new Usuario()));
        service.asociarCuenta(mensaje);
        assertNull(mensaje.getUsuario());
    }

    @Test void conservaMensajesSinCuentaYDescartaUnaRelacionSuministrada() {
        ChatMensaje mensaje = new ChatMensaje();
        mensaje.setTelefono("573153625992");
        mensaje.setUsuario(new Usuario());
        when(repo.findAllByTelefonoIn(any())).thenReturn(List.of());
        service.asociarCuenta(mensaje);
        assertNull(mensaje.getUsuario());
    }

    @Test void ignoraTelefonoVacioSinConsultarUsuarios() {
        ChatMensaje mensaje = new ChatMensaje();
        service.asociarCuenta(mensaje);
        assertNull(mensaje.getUsuario());
        verifyNoInteractions(repo);
    }
}
