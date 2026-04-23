package com.estampaider.config;

import com.estampaider.model.MetodoPago;
import com.estampaider.model.Usuario;
import com.estampaider.model.Rol;
import com.estampaider.repository.MetodoPagoRepository;
import com.estampaider.repository.UsuarioRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initData(
            MetodoPagoRepository metodoRepo,
            UsuarioRepository usuarioRepo
    ) {
        return args -> {

            /* =========================
               MÉTODOS DE PAGO
            ========================== */
            if (metodoRepo.count() == 0) {

                metodoRepo.save(new MetodoPago(
                        "Nequi",
                        "TRANSFERENCIA",
                        "Pago por transferencia Nequi",
                        "3153625992"
                ));

                metodoRepo.save(new MetodoPago(
                        "Pago presencial",
                        "PRESENCIAL",
                        "Pago al entregar el producto",
                        "Calle 11 4-15, Trinidad-Casanare"
                ));

                metodoRepo.save(new MetodoPago(
                        "Código QR",
                        "QR",
                        "Escanea el código QR para pagar",
                        "images/qr-nequi.png"
                ));
            }

            /* =========================
               USUARIO ADMIN
            ========================== */
            if (usuarioRepo.findByTelefono("admin").isEmpty()) {

                BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

                Usuario admin = new Usuario();
                admin.setNombre("Administrador");
                admin.setTelefono("admin");
                admin.setRol(Rol.ADMIN);
                admin.setPassword(encoder.encode("1234"));

                usuarioRepo.save(admin);
            }
        };
    }
}
