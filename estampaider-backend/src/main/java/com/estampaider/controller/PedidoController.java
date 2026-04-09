package com.estampaider.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Set;
import java.util.Map;
import com.estampaider.dto.CrearPedidoRequest;
import com.estampaider.model.DetallePedido;
import com.estampaider.model.Pedido;
import com.estampaider.service.PedidoService;
import com.estampaider.repository.CotizacionRepository;
import com.estampaider.model.Cotizacion;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;

    private final CotizacionRepository cotizacionRepository;

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
            "RECIBIDO", "PENDIENTE", "ENVIADO", "ENTREGADO", "CANCELADO"
    );

    public PedidoController(PedidoService pedidoService,
        CotizacionRepository cotizacionRepository) {
        this.pedidoService = pedidoService;
        this.cotizacionRepository = cotizacionRepository;
}

    /**
     * 🔐 Listar todos los pedidos
     * Seguridad controlada por SecurityConfig (ADMIN)
     */
    @GetMapping
    public ResponseEntity<List<Pedido>> listarPedidos() {
        return ResponseEntity.ok(pedidoService.listarPedidos());
    }

    /**
     * 🔐 Listar pedidos por estado (ADMIN)
     */
    @GetMapping("/estado/{estado}")
    public ResponseEntity<List<Pedido>> listarPorEstado(
            @PathVariable String estado) {

        String estadoNormalizado = estado.toUpperCase();
        validarEstado(estadoNormalizado);

        return ResponseEntity.ok(
                pedidoService.listarPorEstado(estadoNormalizado)
        );
    }

    /**
     * 🔐 Obtener pedido por ID (ADMIN)
     */
    @GetMapping("/{id}")
    public ResponseEntity<Pedido> obtenerPedidoPorId(
            @PathVariable Long id) {

        return pedidoService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 🔐 Listar pedidos por cliente (CLIENTE / ADMIN)
     */
    @GetMapping("/cliente/{clienteId}")
    @Deprecated
    public ResponseEntity<List<Pedido>> listarPorCliente(
        @PathVariable String clienteId) {

    throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Endpoint no permitido"
    );
}
    /**
     * 🔐 Crear pedido (USUARIO / ADMIN)
     */
    @PostMapping
public ResponseEntity<Pedido> guardarPedido(
        @RequestBody CrearPedidoRequest request,
        Authentication authentication) {

    if (authentication == null) {
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "No autenticado"
        );
    }

    String telefono = authentication.getName();

    Pedido pedido = new Pedido();
    pedido.setCliente(request.getCliente());
    pedido.setTelefono(telefono);
    pedido.setDireccion(request.getDireccion());
    pedido.setCiudad(request.getCiudad());
    pedido.setDepartamento(request.getDepartamento());
    pedido.setBarrio(request.getBarrio());
    pedido.setReferencia(request.getReferencia());
    pedido.setMetodoPago(request.getMetodoPago());
    pedido.setTotal(request.getTotal());

    List<DetallePedido> detalles = request.getDetalles().stream().map(d -> {
        DetallePedido detalle = new DetallePedido();
        detalle.setProducto(d.getProducto());
        detalle.setCantidad(d.getCantidad());
        detalle.setPrecioUnitario(d.getPrecioUnitario());
        detalle.setPedido(pedido); // MUY IMPORTANTE
        return detalle;
    }).toList();

    pedido.setDetalles(detalles);

    Pedido guardado = pedidoService.guardarPedido(pedido);

    return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
}
    @GetMapping("/mis-pedidos")
    public ResponseEntity<List<Pedido>> obtenerMisPedidos(
        org.springframework.security.core.Authentication authentication) {

    if (authentication == null) {
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "No autenticado"
        );
    }

    String telefono = authentication.getName();

    List<Pedido> pedidos = pedidoService.listarPorTelefono(telefono);

    return ResponseEntity.ok(pedidos);
}

    /**
     * 🔐 Cambiar estado (ADMIN)
     */
    @PutMapping("/{id}/estado")
    public ResponseEntity<Pedido> cambiarEstado(
            @PathVariable Long id,
            @RequestParam String estado) {

        String estadoNormalizado = estado.toUpperCase();
        validarEstado(estadoNormalizado);

        Pedido pedidoActualizado =
                pedidoService.cambiarEstado(id, estadoNormalizado);

        return ResponseEntity.ok(pedidoActualizado);
    }

    /**
     * 🔐 Marcar como PAGADO (ADMIN)
     */
    @PutMapping("/{id}/pago")
    public ResponseEntity<Pedido> marcarPago(
            @PathVariable Long id) {

        Pedido pedido = pedidoService.obtenerPorId(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Pedido no encontrado"
                ));

        pedido.setEstadoPago("PAGADO");

        Pedido pedidoActualizado =
                pedidoService.guardarPedido(pedido);

        return ResponseEntity.ok(pedidoActualizado);
    }

    /**
     * 🔐 Eliminar pedido (ADMIN)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPedido(
            @PathVariable Long id) {

        pedidoService.eliminarPedido(id);
        return ResponseEntity.noContent().build();
    }

    // 🔹 VER COTIZACIONES (ADMIN)
    @GetMapping("/cotizaciones")
        public ResponseEntity<List<Cotizacion>> verCotizaciones() {
        return ResponseEntity.ok(cotizacionRepository.findAll());
            }

    @GetMapping("/stats")
public ResponseEntity<?> obtenerEstadisticas() {

    List<Pedido> pedidos = pedidoService.listarPedidos();

    int total = pedidos.size();

    long pendientes = pedidos.stream()
            .filter(p -> "PENDIENTE".equals(p.getEstado()))
            .count();

    long enviados = pedidos.stream()
            .filter(p -> "ENVIADO".equals(p.getEstado()))
            .count();

    long entregados = pedidos.stream()
            .filter(p -> "ENTREGADO".equals(p.getEstado()))
            .count();

    double totalVentas = pedidos.stream()
            .filter(p -> "ENTREGADO".equals(p.getEstado()))
            .mapToDouble(Pedido::getTotal)
            .sum();

    double totalPagado = pedidos.stream()
            .filter(p -> "PAGADO".equals(p.getEstadoPago()))
            .mapToDouble(Pedido::getTotal)
            .sum();

    double promedio = entregados > 0 ? totalVentas / entregados : 0;

    // 👑 Cliente TOP
    Map<String, Double> clientes = new HashMap<>();

    pedidos.stream()
            .filter(p -> "ENTREGADO".equals(p.getEstado()))
            .forEach(p -> {
                clientes.put(
                        p.getCliente(),
                        clientes.getOrDefault(p.getCliente(), 0.0) + p.getTotal()
                );
            });

    String clienteTop = "—";
    double max = 0;

    for (Map.Entry<String, Double> entry : clientes.entrySet()) {
        if (entry.getValue() > max) {
            max = entry.getValue();
            clienteTop = entry.getKey();
        }
    }

    Map<String, Object> stats = new HashMap<>();
    stats.put("total", total);
    stats.put("pendientes", pendientes);
    stats.put("enviados", enviados);
    stats.put("entregados", entregados);
    stats.put("totalVentas", totalVentas);
    stats.put("totalPagado", totalPagado);
    stats.put("promedio", promedio);
    stats.put("clienteTop", clienteTop);

    return ResponseEntity.ok(stats);
}
    /* ===============================
       MÉTODOS PRIVADOS
    ================================ */

    private void validarEstado(String estado) {
        if (!ESTADOS_VALIDOS.contains(estado)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Estado inválido: " + estado
            );
        }
    }
}
