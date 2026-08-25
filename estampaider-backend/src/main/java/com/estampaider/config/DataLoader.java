package com.estampaider.config;

import com.estampaider.model.Producto;
import com.estampaider.repository.ProductoRepository;
import com.estampaider.service.ProductoService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner initDatabase(
            ProductoRepository productoRepository,
            ProductoService productoService) {
        return args -> {
            if (productoRepository.count() > 0) {
                System.out.println("Los productos ya están cargados.");
                return;
            }

            crear(productoService, "Camiseta piel durazno", "camiseta_piel_durazno.jpg", 30000);
            crear(productoService, "Camiseta de algodón", "camiseta_algodon.jpg", 40000);
            crear(productoService, "Camiseta tipo polo", "camiseta_polo.jpg", 52000);
            crear(productoService, "Mug 11 Oz", "mug_clasico.jpg", 13000);
            crear(productoService, "Mug 11 Oz Mágico", "mug_magico.jpg", 20000);
            crear(productoService, "Mug 11 oz Color interno y oreja", "mug_color.jpg", 16000);
            crear(productoService, "Mug Polka Travel 450ml", "vaso_viajero.jpg", 30000);
            crear(productoService, "Llavero", "llavero.jpg", 8000);
            crear(productoService, "Imán", "iman.jpg", 7000);
            crear(productoService, "Cachucha", "cachucha.jpg", 20000);
            crear(productoService, "Caramañola", "caramañola.jpg", 25000);
            crear(productoService, "Rompecabezas", "rompecabezas.jpg", 15000);
            crear(productoService, "PadMouse", "padmouse.jpg", 16000);
            crear(productoService, "Platos", "plato.jpg", 15000);
            crear(productoService, "Mantel Claro", "mantel_claro.jpg", 35000);
            crear(productoService, "Mantel Oscuro", "mantel_oscuro.jpg", 42000);
            crear(productoService, "Carcasa para celular", "carcasa.jpg", 22000);
            crear(productoService, "Portarretrato 30x20 cm", "portarretrato_30x20.jpg", 21000);
            crear(productoService, "Portarretrato 20x15 cm", "portarretrato_20x15.jpg", 21000);
            System.out.println("Productos iniciales cargados correctamente.");
        };
    }

    private void crear(ProductoService productoService, String nombre, String imagen, double precio) {
        Producto producto = new Producto(nombre, imagen, precio);
        producto.setCategoria("Sin categoría");
        productoService.crearProducto(producto);
    }
}
