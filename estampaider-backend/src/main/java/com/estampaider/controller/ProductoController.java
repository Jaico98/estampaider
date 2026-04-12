package com.estampaider.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.estampaider.model.Producto;
import com.estampaider.service.ProductoService;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @GetMapping
    public ResponseEntity<List<Producto>> listarProductos() {
        return ResponseEntity.ok(productoService.listarProductosActivos());
    }

    @GetMapping("/admin/todos")
    public ResponseEntity<List<Producto>> listarTodos() {
        return ResponseEntity.ok(productoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Producto> obtenerProductoPorId(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Producto> crearProducto(@RequestBody Producto producto) {
        validarProducto(producto);
        Producto creado = productoService.crearProducto(producto);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Producto> actualizarProducto(
            @PathVariable Long id,
            @RequestBody Producto productoActualizado) {

        validarProducto(productoActualizado);
        Producto guardado = productoService.actualizarProducto(id, productoActualizado);
        return ResponseEntity.ok(guardado);
    }

    @PatchMapping("/{id}/activo")
    public ResponseEntity<Producto> cambiarActivo(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {

        boolean activo = body.getOrDefault("activo", true);
        Producto actualizado = productoService.cambiarEstadoActivo(id, activo);
        return ResponseEntity.ok(actualizado);
    }

    @PutMapping("/admin/orden")
    public ResponseEntity<Void> actualizarOrden(@RequestBody List<Long> idsEnOrden) {
        productoService.actualizarOrden(idsEnOrden);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
        return ResponseEntity.noContent().build();
    }

    private void validarProducto(Producto producto) {
        if (producto == null) {
            throw new IllegalArgumentException("Producto inválido");
        }

        if (producto.getNombre() == null || producto.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }

        if (producto.getImagenUrl() == null || producto.getImagenUrl().trim().isEmpty()) {
            throw new IllegalArgumentException("La imagen es obligatoria");
        }

        if (producto.getPrecio() <= 0) {
            throw new IllegalArgumentException("El precio debe ser mayor a 0");
        }
    }
}

