package com.estampaider.config;

import com.estampaider.model.MetodoPago;
import com.estampaider.model.EstadoPedido;
import com.estampaider.repository.EstadoPedidoRepository;
import com.estampaider.repository.MetodoPagoRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initData(
            MetodoPagoRepository metodoRepo,
            EstadoPedidoRepository estadoRepo) {
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
                        "https://jaico98.github.io/estampaider/images/qr-nequi.png"
                ));
            }

            if (estadoRepo.count() == 0) {
                String[] estados = {"RECIBIDO", "PENDIENTE", "ENVIADO", "ENTREGADO", "CANCELADO"};
                for (int i = 0; i < estados.length; i++) {
                    EstadoPedido estado = new EstadoPedido();
                    estado.setNombre(estados[i]);
                    estado.setOrden(i + 1);
                    estadoRepo.save(estado);
                }
            }

        };
    }
}
