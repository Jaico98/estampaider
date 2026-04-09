package com.estampaider.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.estampaider.model.Producto;
import com.estampaider.repository.ProductoRepository;

@Service
public class ProductoService {

    private final ProductoRepository productoRepository;

    public ProductoService(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    /**
     * Listar todos los productos
     */
    public List<Producto> listarProductos() {
        return productoRepository.findAll();
    }

    /**
     * Guardar producto (solo admin)
     */
    public Producto guardarProducto(Producto producto) {

        productoRepository.findByNombre(producto.getNombre())
                .ifPresent(p -> {
                    throw new IllegalArgumentException("El producto ya existe");
                });

        return productoRepository.save(producto);
    }

    /**
     * Buscar producto por ID
     */
    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Producto no encontrado")
                );
    }

    /**
     * Eliminar producto
     */
    public void eliminarProducto(Long id) {
        productoRepository.deleteById(id);
    }
}

