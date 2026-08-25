package com.estampaider.service;

import com.estampaider.model.Categoria;
import com.estampaider.model.Color;
import com.estampaider.model.Producto;
import com.estampaider.model.Talla;
import com.estampaider.repository.CategoriaRepository;
import com.estampaider.repository.ColorRepository;
import com.estampaider.repository.ProductoRepository;
import com.estampaider.repository.TallaRepository;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductoService {

    private static final String CATEGORIA_POR_DEFECTO = "Sin categoría";

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final TallaRepository tallaRepository;
    private final ColorRepository colorRepository;

    public ProductoService(
            ProductoRepository productoRepository,
            CategoriaRepository categoriaRepository,
            TallaRepository tallaRepository,
            ColorRepository colorRepository) {
        this.productoRepository = productoRepository;
        this.categoriaRepository = categoriaRepository;
        this.tallaRepository = tallaRepository;
        this.colorRepository = colorRepository;
    }

    public List<Producto> listarProductosActivos() {
        return productoRepository.findByActivoTrueOrderByIdAsc();
    }

    public List<Producto> listarTodos() {
        return productoRepository.findAllByOrderByIdAsc();
    }

    @Transactional
    public Producto crearProducto(Producto producto) {
        validarProducto(producto);
        String nombre = producto.getNombre().trim();

        productoRepository.findByNombreIgnoreCase(nombre).ifPresent(p -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ya existe un producto con ese nombre");
        });

        producto.setNombre(nombre);
        producto.setImagenUrl(producto.getImagenUrl().trim());
        producto.setDescripcion(trimOrNull(producto.getDescripcion()));
        producto.setEtiqueta(normalizarEtiqueta(producto.getEtiqueta()));
        producto.setCategoriaEntidad(obtenerCategoria(producto.getCategoria()));
        producto.setTallas(resolverTallas(producto.getTallasDisponibles()));
        producto.setColores(resolverColores(producto.getColoresDisponibles()));
        producto.setActivo(true);
        return productoRepository.save(producto);
    }

    @Transactional
    public Producto actualizarProducto(Long id, Producto datos) {
        Producto existente = buscarPorId(id);
        validarProducto(datos);
        String nombre = datos.getNombre().trim();

        productoRepository.findByNombreIgnoreCase(nombre).ifPresent(p -> {
            if (!p.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Ya existe otro producto con ese nombre");
            }
        });

        existente.setNombre(nombre);
        existente.setImagenUrl(datos.getImagenUrl().trim());
        existente.setPrecio(datos.getPrecio());
        existente.setDescripcion(trimOrNull(datos.getDescripcion()));
        existente.setEtiqueta(normalizarEtiqueta(datos.getEtiqueta()));
        existente.setCategoriaEntidad(obtenerCategoria(datos.getCategoria()));
        existente.setTallas(resolverTallas(datos.getTallasDisponibles()));
        existente.setColores(resolverColores(datos.getColoresDisponibles()));
        return productoRepository.save(existente);
    }

    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
    }

    public Producto cambiarEstadoActivo(Long id, boolean activo) {
        Producto producto = buscarPorId(id);
        producto.setActivo(activo);
        return productoRepository.save(producto);
    }

    /** El orden dejó de ser persistente; se conserva el contrato del endpoint antiguo. */
    public void actualizarOrden(List<Long> idsEnOrden) {
        if (idsEnOrden == null || idsEnOrden.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lista de orden vacía");
        }
        idsEnOrden.forEach(this::buscarPorId);
    }

    /** Desactivación lógica para conservar las referencias históricas de los pedidos. */
    @Transactional
    public void eliminarProducto(Long id) {
        Producto producto = buscarPorId(id);
        producto.setActivo(false);
        productoRepository.save(producto);
    }

    private Categoria obtenerCategoria(String nombre) {
        String valor = nombre == null || nombre.isBlank()
                ? CATEGORIA_POR_DEFECTO
                : nombre.trim();
        return categoriaRepository.findByNombreIgnoreCase(valor).orElseGet(() -> {
            Categoria categoria = new Categoria();
            categoria.setNombre(valor);
            categoria.setActivo(true);
            return categoriaRepository.save(categoria);
        });
    }

    private Set<Talla> resolverTallas(String valor) {
        Set<Talla> resultado = new LinkedHashSet<>();
        for (String nombre : nombres(valor)) {
            resultado.add(tallaRepository.findByNombreIgnoreCase(nombre).orElseGet(() -> {
                Talla talla = new Talla();
                talla.setNombre(nombre);
                return tallaRepository.save(talla);
            }));
        }
        return resultado;
    }

    private Set<Color> resolverColores(String valor) {
        Set<Color> resultado = new LinkedHashSet<>();
        for (String nombre : nombres(valor)) {
            resultado.add(colorRepository.findByNombreIgnoreCase(nombre).orElseGet(() -> {
                Color color = new Color();
                color.setNombre(nombre);
                return colorRepository.save(color);
            }));
        }
        return resultado;
    }

    private List<String> nombres(String valor) {
        if (valor == null || valor.isBlank()) return List.of();
        return Arrays.stream(valor.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .distinct()
                .collect(Collectors.toList());
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
        if (etiqueta == null || etiqueta.isBlank()) return null;
        String valor = etiqueta.trim().toUpperCase();
        if (!valor.equals("MAS_VENDIDO") && !valor.equals("NUEVO")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Etiqueta inválida. Usa MAS_VENDIDO o NUEVO");
        }
        return valor;
    }

    private String trimOrNull(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
