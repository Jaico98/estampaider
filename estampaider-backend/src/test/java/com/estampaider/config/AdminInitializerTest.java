package com.estampaider.config;

import com.estampaider.model.Rol;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminInitializerTest {
    private final UsuarioRepository repository = mock(UsuarioRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AdminInitializer initializer = new AdminInitializer();

    @Test void disabledDoesNotReadOrWriteAccounts() throws Exception {
        initializer.initAdmin(repository, encoder, false, "", "", "", "").run();
        verifyNoInteractions(repository, encoder);
    }

    @Test void existingAccountIsNeverChangedOrPromoted() throws Exception {
        Usuario existing = new Usuario();
        existing.setRol(Rol.CLIENTE);
        existing.setPassword("existing-hash");
        when(repository.findByUsuario("ADMIN")).thenReturn(Optional.of(existing));
        initializer.initAdmin(repository, encoder, true, "ADMIN", "", "", "").run();
        assertEquals(Rol.CLIENTE, existing.getRol());
        assertEquals("existing-hash", existing.getPassword());
        verify(repository, never()).save(any());
        verifyNoInteractions(encoder);
    }

    @Test void createsOnlyNewAccountWithEncodedExplicitPassword() throws Exception {
        when(encoder.encode("test-only-password")).thenReturn("encoded");
        initializer.initAdmin(repository, encoder, true, "ADMIN", "test-only-password",
                "admin@example.test", "3001234567").run();
        ArgumentCaptor<Usuario> captured = ArgumentCaptor.forClass(Usuario.class);
        verify(repository).save(captured.capture());
        assertEquals(Rol.ADMIN, captured.getValue().getRol());
        assertEquals("encoded", captured.getValue().getPassword());
        assertEquals("admin@example.test", captured.getValue().getCorreo());
    }

    @Test void missingCredentialsFailWithoutWrites() {
        assertThrows(IllegalStateException.class, () -> initializer.initAdmin(repository,
                encoder, true, "ADMIN", "", "", "").run());
        verify(repository, never()).save(any());
        verifyNoInteractions(encoder);
    }

    @Test void conflictingContactDoesNotPromoteExistingClient() {
        when(repository.findAllByTelefonoOrCorreo("3001234567", "admin@example.test"))
                .thenReturn(List.of(new Usuario()));
        assertThrows(IllegalStateException.class, () -> initializer.initAdmin(repository,
                encoder, true, "ADMIN", "test-only-password", "admin@example.test", "3001234567").run());
        verify(repository, never()).save(any());
        verifyNoInteractions(encoder);
    }
}
