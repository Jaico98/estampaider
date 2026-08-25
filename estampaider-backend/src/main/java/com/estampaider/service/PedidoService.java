package com.estampaider.service;

import com.estampaider.model.Color;
import com.estampaider.model.DetallePedido;
import com.estampaider.model.DireccionEntrega;
import com.estampaider.model.EstadoPedido;
import com.estampaider.model.MetodoPago;
import com.estampaider.model.Pedido;
import com.estampaider.model.PedidoHistorial;
import com.estampaider.model.Producto;
import com.estampaider.model.Talla;
import com.estampaider.model.Usuario;
import com.estampaider.repository.ColorRepository;
import com.estampaider.repository.DireccionEntregaRepository;
import com.estampaider.repository.EstadoPedidoRepository;
import com.estampaider.repository.MetodoPagoRepository;
import com.estampaider.repository.PedidoRepository;
import com.estampaider.repository.ProductoRepository;
import com.estampaider.repository.TallaRepository;
import com.estampaider.repository.UsuarioRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PedidoService {

    private static final List<String> ESTADOS_VALIDOS = List.of(
            "RECIBIDO", "PENDIENTE", "ENVIADO", "ENTREGADO", "CANCELADO");

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoRepository productoRepository;
    private final TallaRepository tallaRepository;
    private final ColorRepository colorRepository;
    private final EstadoPedidoRepository estadoRepository;
    private final MetodoPagoRepository metodoPagoRepository;
    private final DireccionEntregaRepository direccionRepository;

    public PedidoService(
            PedidoRepository pedidoRepository,
            UsuarioRepository usuarioRepository,
            ProductoRepository productoRepository,
            TallaRepository tallaRepository,
            ColorRepository colorRepository,
            EstadoPedidoRepository estadoRepository,
            MetodoPagoRepository metodoPagoRepository,
            DireccionEntregaRepository direccionRepository) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.tallaRepository = tallaRepository;
        this.colorRepository = colorRepository;
        this.estadoRepository = estadoRepository;
        this.metodoPagoRepository = metodoPagoRepository;
        this.direccionRepository = direccionRepository;
    }

    public List<Pedido> listarPorTelefono(String telefono) {
        Usuario usuario = buscarUsuario(telefono);
        return pedidoRepository.findByUsuario_IdOrderByFechaDesc(usuario.getId());
    }

    public List<Pedido> listarPorIdentificador(String identificador) {
        return listarPorTelefono(identificador);
    }

    public List<Pedido> listarPedidos() {
        return pedidoRepository.findAll();
    }

    public List<Pedido> listarPorEstado(String estado) {
        String estadoNormalizado = normalizarEstado(estado);
        return pedidoRepository.findByEstadoEntidad_NombreIgnoreCase(estadoNormalizado);
    }

    @Transactional
    public Pedido guardarPedido(Pedido pedido) {
        if (pedido == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pedido inválido");
        }

        Usuario usuario = pedido.getUsuario();
        if (usuario == null) {
            usuario = buscarUsuario(pedido.getTelefono());
            pedido.setUsuario(usuario);
        }

        String estado = pedido.getEstado();
        EstadoPedido estadoEntidad = obtenerEstado(estado == null || estado.isBlank() ? "RECIBIDO" : estado);
        pedido.setEstadoEntidad(estadoEntidad);
        pedido.setMetodoPagoEntidad(obtenerMetodoPago(pedido.getMetodoPago()));

        if (pedido.getDireccionEntidad() == null) {
            pedido.setDireccionEntidad(obtenerDireccion(pedido, usuario));
        }

        if (pedido.getDetalles() == null || pedido.getDetalles().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El pedido debe tener al menos un producto");
        }

        BigDecimal total = BigDecimal.ZERO;
        for (DetallePedido detalle : pedido.getDetalles()) {
            prepararDetalle(detalle, pedido);
            total = total.add(detalle.getPrecioUnitarioDecimal()
                    .multiply(BigDecimal.valueOf(detalle.getCantidad())));
        }
        pedido.setTotalDecimal(total);

        boolean esNuevo = pedido.getId() == null;
        if (esNuevo) {
            agregarHistorial(pedido, estadoEntidad, usuario, "Pedido creado");
        }

        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido cambiarEstado(Long id, String nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Pedido no encontrado con id: " + id));
        EstadoPedido nuevo = obtenerEstado(nuevoEstado);
        String anterior = pedido.getEstado();
        pedido.setEstadoEntidad(nuevo);
        if (!nuevo.getNombre().equalsIgnoreCase(anterior)) {
            agregarHistorial(pedido, nuevo, pedido.getUsuario(), "Estado actualizado por el administrador");
        }
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido marcarPago(Long id) {
        Pedido pedido = pedidoRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));
        pedido.setEstadoPago("PAGADO");
        return pedidoRepository.save(pedido);
    }

    public void eliminarPedido(Long id) {
        if (!pedidoRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No se puede eliminar: pedido inexistente");
        }
        pedidoRepository.deleteById(id);
    }

    public Optional<Pedido> obtenerPorId(Long id) {
        return pedidoRepository.findById(id);
    }

    public boolean esPropietario(String identificador, Pedido pedido) {
        if (pedido == null || pedido.getUsuario() == null) return false;
        String valor = identificador == null ? "" : identificador.trim();
        return coincide(valor, pedido.getUsuario().getTelefono())
                || coincide(valor, pedido.getUsuario().getUsuario());
    }

    private void prepararDetalle(DetallePedido detalle, Pedido pedido) {
        if (detalle == null || detalle.getProducto() == null || detalle.getProducto().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cada detalle debe tener producto");
        }
        if (detalle.getCantidad() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La cantidad debe ser mayor a 0");
        }

        Producto producto = productoRepository.findByNombreIgnoreCase(detalle.getProducto().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Producto no encontrado: " + detalle.getProducto()));
        if (!producto.isActivo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El producto no está disponible: " + producto.getNombre());
        }

        detalle.setProductoEntidad(producto);
        detalle.setProductoNombre(producto.getNombre());
        detalle.setPrecioUnitarioDecimal(producto.getPrecioDecimal());
        detalle.setTallaEntidad(resolverTalla(detalle.getTalla(), producto));
        detalle.setColorEntidad(resolverColor(detalle.getColor(), producto));
        detalle.setPedido(pedido);
    }

    private Talla resolverTalla(String nombre, Producto producto) {
        if (nombre == null || nombre.isBlank()) return null;
        Talla talla = tallaRepository.findByNombreIgnoreCase(nombre.trim()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "Talla no válida: " + nombre));
        validarOpcionProducto(producto.getTallas(), talla, "talla", nombre);
        return talla;
    }

    private Color resolverColor(String nombre, Producto producto) {
        if (nombre == null || nombre.isBlank()) return null;
        Color color = colorRepository.findByNombreIgnoreCase(nombre.trim()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "Color no válido: " + nombre));
        validarOpcionProducto(producto.getColores(), color, "color", nombre);
        return color;
    }

    private void validarOpcionProducto(Set<?> opciones, Object opcion, String tipo, String nombre) {
        if (opciones == null || !opciones.contains(opcion)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La " + tipo + " " + nombre + " no está disponible para el producto");
        }
    }

    private DireccionEntrega obtenerDireccion(Pedido pedido, Usuario usuario) {
        String direccion = texto(pedido.getDireccion());
        String ciudad = texto(pedido.getCiudad());
        String departamento = texto(pedido.getDepartamento());
        if (direccion.isBlank() || ciudad.isBlank() || departamento.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La dirección, ciudad y departamento son obligatorios");
        }
        String barrio = textoNulo(pedido.getBarrio());
        String referencia = textoNulo(pedido.getReferencia());

        return direccionRepository.findAll().stream()
                .filter(d -> d.getUsuario() != null && usuario.getId().equals(d.getUsuario().getId()))
                .filter(d -> direccion.equalsIgnoreCase(d.getDireccion()))
                .filter(d -> ciudad.equalsIgnoreCase(d.getCiudad()))
                .filter(d -> departamento.equalsIgnoreCase(d.getDepartamento()))
                .filter(d -> iguales(d.getBarrio(), barrio) && iguales(d.getReferencia(), referencia))
                .findFirst()
                .orElseGet(() -> {
                    DireccionEntrega nueva = new DireccionEntrega();
                    nueva.setUsuario(usuario);
                    nueva.setDireccion(direccion);
                    nueva.setBarrio(barrio);
                    nueva.setCiudad(ciudad);
                    nueva.setDepartamento(departamento);
                    nueva.setReferencia(referencia);
                    return direccionRepository.save(nueva);
                });
    }

    private MetodoPago obtenerMetodoPago(String nombre) {
        if (nombre == null || nombre.isBlank()) return null;
        return metodoPagoRepository.findByNombreIgnoreCase(nombre.trim()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Método de pago no válido: " + nombre));
    }

    private EstadoPedido obtenerEstado(String nombre) {
        String normalizado = normalizarEstado(nombre);
        return estadoRepository.findByNombreIgnoreCase(normalizado).orElseGet(() -> {
            EstadoPedido estado = new EstadoPedido();
            estado.setNombre(normalizado);
            estado.setOrden(ESTADOS_VALIDOS.indexOf(normalizado) + 1);
            return estadoRepository.save(estado);
        });
    }

    private void agregarHistorial(Pedido pedido, EstadoPedido estado, Usuario usuario, String observacion) {
        PedidoHistorial historial = new PedidoHistorial();
        historial.setPedido(pedido);
        historial.setEstado(estado);
        historial.setUsuario(usuario);
        historial.setFecha(LocalDateTime.now());
        historial.setObservacion(observacion);
        pedido.getHistorial().add(historial);
    }

    private Usuario buscarUsuario(String identificador) {
        String valor = identificador == null ? "" : identificador.trim();
        if (valor.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }
        return usuarioRepository.findByTelefono(valor)
                .or(() -> usuarioRepository.findByTelefono(valor.replaceAll("\\D", "")))
                .or(() -> usuarioRepository.findByUsuario(valor))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Usuario no encontrado"));
    }

    private String normalizarEstado(String estado) {
        String valor = estado == null ? "" : estado.trim().toUpperCase(Locale.ROOT);
        if (!ESTADOS_VALIDOS.contains(valor)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado inválido: " + estado);
        }
        return valor;
    }

    private boolean coincide(String primero, String segundo) {
        if (primero == null || segundo == null) return false;
        String a = primero.replaceAll("\\D", "");
        String b = segundo.replaceAll("\\D", "");
        return (!a.isBlank() && a.equals(b)) || primero.equalsIgnoreCase(segundo);
    }

    private boolean iguales(String primero, String segundo) {
        if (primero == null || primero.isBlank()) return segundo == null || segundo.isBlank();
        return primero.equalsIgnoreCase(segundo);
    }

    private String texto(String valor) { return valor == null ? "" : valor.trim(); }
    private String textoNulo(String valor) { return texto(valor).isBlank() ? null : texto(valor); }
}
