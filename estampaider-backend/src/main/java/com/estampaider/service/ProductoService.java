package com.estampaider.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.estampaider.model.Producto;
import com.estampaider.repository.ProductoRepository;

@Service
public class ProductoService {

    private final ProductoRepository productoRepository;

    public ProductoService(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    public List<Producto> listarProductosActivos() {
        return productoRepository.findByActivoTrueOrderByOrdenAscIdAsc();
    }

    public List<Producto> listarTodos() {
        return productoRepository.findAllByOrderByOrdenAscIdAsc();
    }

    public Producto crearProducto(Producto producto) {
        validarProducto(producto);

        productoRepository.findByNombreIgnoreCase(producto.getNombre().trim())
            .ifPresent(p -> {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ya existe un producto con ese nombre"
                );
            });

        producto.setNombre(producto.getNombre().trim());
        producto.setImagenUrl(producto.getImagenUrl().trim());
        producto.setActivo(true);
        producto.setEtiqueta(normalizarEtiqueta(producto.getEtiqueta()));
        producto.setOrden(productoRepository.findAll().size());

        return productoRepository.save(producto);
    }

    public Producto actualizarProducto(Long id, Producto datos) {
        Producto existente = buscarPorId(id);

        validarProducto(datos);

        productoRepository.findByNombreIgnoreCase(datos.getNombre().trim())
            .ifPresent(p -> {
                if (!p.getId().equals(id)) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Ya existe otro producto con ese nombre"
                    );
                }
            });

        existente.setNombre(datos.getNombre().trim());
        existente.setImagenUrl(datos.getImagenUrl().trim());
        existente.setPrecio(datos.getPrecio());
        existente.setDescripcion(datos.getDescripcion());
        existente.setCategoria(datos.getCategoria());
        existente.setEtiqueta(normalizarEtiqueta(datos.getEtiqueta()));

        return productoRepository.save(existente);
    }

    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Producto no encontrado"
                )
            );
    }

    public Producto cambiarEstadoActivo(Long id, boolean activo) {
        Producto producto = buscarPorId(id);
        producto.setActivo(activo);
        return productoRepository.save(producto);
    }

    public void actualizarOrden(List<Long> idsEnOrden) {
        if (idsEnOrden == null || idsEnOrden.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lista de orden vacía");
        }

        for (int i = 0; i < idsEnOrden.size(); i++) {
            Producto producto = buscarPorId(idsEnOrden.get(i));
            producto.setOrden(i);
            productoRepository.save(producto);
        }
    }

    public void eliminarProducto(Long id) {
        Producto producto = buscarPorId(id);
        productoRepository.delete(producto);
    }

    private void validarProducto(Producto producto) {
        if (producto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Producto inválido");
        }

        if (producto.getNombre() == null || producto.getNombre().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio");
        }

        if (producto.getImagenUrl() == null || producto.getImagenUrl().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen es obligatoria");
        }

        if (producto.getPrecio() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio debe ser mayor a 0");
        }
    }

    private String normalizarEtiqueta(String etiqueta) {
        if (etiqueta == null || etiqueta.isBlank()) {
            return null;
        }

        String valor = etiqueta.trim().toUpperCase();

        if (!valor.equals("MAS_VENDIDO") && !valor.equals("NUEVO")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Etiqueta inválida. Usa MAS_VENDIDO o NUEVO"
            );
        }

        return valor;
    }
}

