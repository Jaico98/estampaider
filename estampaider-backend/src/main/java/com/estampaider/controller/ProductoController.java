package com.estampaider.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.estampaider.model.Producto;
import com.estampaider.service.ProductoService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    // ✅ GET FUNCIONANDO
    @GetMapping
    public ResponseEntity<List<Producto>> listarProductos() {
        List<Producto> productos = productoService.listarProductos();
        return ResponseEntity.ok(productos);
    }
@GetMapping("/{id}")
public ResponseEntity<Producto> obtenerProductoPorId(@PathVariable Long id) {

    Producto producto = productoService.buscarPorId(id);

    if (producto == null) {
        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Producto no encontrado"
        );
    }

    return ResponseEntity.ok(producto);
}
    // ✅ POST ADMIN
    @PostMapping
    public ResponseEntity<Producto> crearProducto(
            @RequestBody Producto producto,
            @RequestHeader(value = "X-ROLE", required = false) String rol) {

        if (rol == null) rol = "ADMIN"; // desarrollo

        if (!"ADMIN".equalsIgnoreCase(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Producto creado = productoService.guardarProducto(producto);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    // ✅ DELETE ADMIN
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarProducto(
            @PathVariable Long id,
            @RequestHeader(value = "X-ROLE", required = false) String rol) {

        if (rol == null) rol = "ADMIN"; // desarrollo

        if (!"ADMIN".equalsIgnoreCase(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        productoService.eliminarProducto(id);
        return ResponseEntity.noContent().build();
    }
}

