package com.estampaider.config;

import com.estampaider.model.Rol;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminInitializer {
    @Bean
    CommandLineRunner initAdmin(UsuarioRepository repository, PasswordEncoder encoder,
            @Value("${app.bootstrap-admin.enabled:false}") boolean enabled,
            @Value("${app.bootstrap-admin.username:}") String username,
            @Value("${app.bootstrap-admin.password:}") String password,
            @Value("${app.bootstrap-admin.email:}") String email,
            @Value("${app.bootstrap-admin.phone:}") String phone) {
        return args -> {
            if (!enabled) return;
            if (username.isBlank()) {
                throw new IllegalStateException("Configura ADMIN_BOOTSTRAP_USERNAME para crear la cuenta inicial");
            }
            // No promover, modificar ni restablecer cuentas existentes.
            if (repository.findByUsuario(username.trim()).isPresent()) return;
            if (password.isBlank() || password.length() < 12
                    || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
                    || email.isBlank() || phone.isBlank()) {
                throw new IllegalStateException("La cuenta inicial requiere correo, teléfono y contraseña de al menos 12 caracteres y máximo 72 bytes");
            }
            if (!repository.findAllByTelefonoOrCorreo(phone.trim(), email.trim()).isEmpty()) {
                throw new IllegalStateException("No se crea la cuenta inicial: correo o teléfono ya registrado");
            }
            Usuario admin = new Usuario();
            admin.setNombre("Administrador");
            admin.setUsuario(username.trim());
            admin.setCorreo(email.trim());
            admin.setTelefono(phone.trim());
            admin.setRol(Rol.ADMIN);
            admin.setPassword(encoder.encode(password));
            repository.save(admin);
        };
    }
}
