package com.estampaider.config;

import com.estampaider.model.Rol;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminInitializer {

    @Bean
    CommandLineRunner initAdmin(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String adminUsuario = "ADMIN";
            String adminPassword = "Jaico*98";
            String adminCorreo = "admin@estampaider.com";
            String adminTelefono = "3000000000";

            Usuario admin = usuarioRepository.findByUsuario(adminUsuario).orElse(null);

            if (admin == null) {
                admin = new Usuario();
                admin.setNombre("Administrador");
                admin.setUsuario(adminUsuario);
                admin.setCorreo(adminCorreo);
                admin.setTelefono(adminTelefono);
                admin.setRol(Rol.ADMIN);
                admin.setPassword(passwordEncoder.encode(adminPassword));

                usuarioRepository.save(admin);
                System.out.println("✅ Admin creado automáticamente");
            } else {
                boolean actualizado = false;

                if (admin.getRol() != Rol.ADMIN) {
                    admin.setRol(Rol.ADMIN);
                    actualizado = true;
                }

                if (admin.getUsuario() == null || admin.getUsuario().isBlank()) {
                    admin.setUsuario(adminUsuario);
                    actualizado = true;
                }

                if (admin.getPassword() == null || !passwordEncoder.matches(adminPassword, admin.getPassword())) {
                    admin.setPassword(passwordEncoder.encode(adminPassword));
                    actualizado = true;
                }

                if (actualizado) {
                    usuarioRepository.save(admin);
                    System.out.println("✅ Admin actualizado automáticamente");
                } else {
                    System.out.println("ℹ️ Admin ya existe correctamente");
                }
            }
        };
    }
}