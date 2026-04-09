package com.estampaider.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.estampaider.model.Producto;
import com.estampaider.repository.ProductoRepository;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner initDatabase(ProductoRepository productoRepository) {
        return args -> {

            if (productoRepository.count() == 0) {

                productoRepository.save(
                        new Producto(
                                "Camiseta piel durazno",
                                "camiseta_piel_durazno.jpg",
                                30000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Camiseta de algodón",
                                "camiseta_algodon.jpg",
                                40000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Camiseta tipo polo",
                                "camiseta_polo.jpg",
                                52000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Mug 11 Oz",
                                "mug_clasico.jpg",
                                13000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Mug 11 Oz Mágico",
                                "mug_magico.jpg",
                                20000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Mug 11 oz Color interno y oreja",
                                "mug_color.jpg",
                                16000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Mug Polka Travel 450ml",
                                "vaso_viajero.jpg",
                                30000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Llavero",
                                "llavero.jpg",
                                8000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Imán",
                                "iman.jpg",
                                7000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Cachucha",
                                "cachucha.jpg",
                                20000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Caramañola",
                                "caramañola.jpg",
                                25000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Rompecabezas",
                                "rompecabezas.jpg",
                                15000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "PadMouse",
                                "padmouse.jpg",
                                16000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Platos",
                                "plato.jpg",
                                15000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Mantel Claro",
                                "mantel_claro.jpg",
                                35000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Mantel Ocuro",
                                "mantel_oscuro.jpg",
                                42000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Carcasa Para celular",
                                "carcasa.jpg",
                                22000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Portarretrato 30x20 cm",
                                "portarretrato_30x20.jpg",
                                21000
                        )
                );

                productoRepository.save(
                        new Producto(
                                "Portarretrato 20x15 cm",
                                "portarretrato_20x15.jpg",
                                21000
                        )
                );

                System.out.println("✅ Productos iniciales cargados correctamente.");

            } else {
                System.out.println("ℹ️ Los productos ya están cargados.");
            }
        };
    }
}
