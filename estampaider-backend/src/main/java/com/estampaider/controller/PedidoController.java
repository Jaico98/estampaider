package com.estampaider.controller;

import com.estampaider.dto.CrearPedidoRequest;
import com.estampaider.model.Cotizacion;
import com.estampaider.model.DetallePedido;
import com.estampaider.model.Pedido;
import com.estampaider.repository.CotizacionRepository;
import com.estampaider.service.PedidoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;
    private final CotizacionRepository cotizacionRepository;

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
        "RECIBIDO",
        "PENDIENTE",
        "ENVIADO",
        "ENTREGADO",
        "CANCELADO"
    );

    public PedidoController(PedidoService pedidoService, CotizacionRepository cotizacionRepository) {
        this.pedidoService = pedidoService;
        this.cotizacionRepository = cotizacionRepository;
    }

    @GetMapping
    public ResponseEntity<List<Pedido>> listarPedidos() {
        return ResponseEntity.ok(pedidoService.listarPedidos());
    }

    @GetMapping("/estado/{estado}")
    public ResponseEntity<List<Pedido>> listarPorEstado(@PathVariable String estado) {
        String estadoNormalizado = estado.toUpperCase();
        validarEstado(estadoNormalizado);
        return ResponseEntity.ok(pedidoService.listarPorEstado(estadoNormalizado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pedido> obtenerPedidoPorId(@PathVariable Long id, Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        Pedido pedido = pedidoService.obtenerPorId(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));

        if (esAdmin(authentication) || esPropietario(authentication, pedido)) {
            return ResponseEntity.ok(pedido);
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes acceso a este pedido");
    }

    @GetMapping("/cliente/{clienteId}")
    @Deprecated
    public ResponseEntity<List<Pedido>> listarPorCliente(@PathVariable String clienteId) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Endpoint no permitido");
    }

    @PostMapping
    public ResponseEntity<Pedido> guardarPedido(@RequestBody CrearPedidoRequest request, Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solicitud inválida");
        }

        if (request.getDetalles() == null || request.getDetalles().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El pedido debe tener al menos un producto");
        }

        String telefono = normalizarTelefono(authentication.getName());

        Pedido pedido = new Pedido();
        pedido.setCliente(textoSeguro(request.getCliente()));
        pedido.setTelefono(telefono);
        pedido.setDireccion(textoSeguro(request.getDireccion()));
        pedido.setCiudad(textoSeguro(request.getCiudad()));
        pedido.setDepartamento(textoSeguro(request.getDepartamento()));
        pedido.setBarrio(textoSeguro(request.getBarrio()));
        pedido.setReferencia(textoSeguro(request.getReferencia()));
        pedido.setMetodoPago(textoSeguro(request.getMetodoPago()));

        List<DetallePedido> detalles = request.getDetalles().stream().map(d -> {
            if (d == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hay un detalle de pedido inválido");
            }
            if (d.getProducto() == null || d.getProducto().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada detalle debe tener producto");
            }
            if (d.getCantidad() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser mayor a 0");
            }
            if (d.getPrecioUnitario() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El precio unitario debe ser mayor a 0");
            }
        
            DetallePedido detalle = new DetallePedido();
            detalle.setProducto(d.getProducto().trim());
            detalle.setCantidad(d.getCantidad());
            detalle.setPrecioUnitario(d.getPrecioUnitario());
            detalle.setTalla(textoSeguro(d.getTalla()));
            detalle.setColor(textoSeguro(d.getColor()));
            detalle.setPedido(pedido);
            return detalle;
        }).toList();
        
        double totalCalculado = detalles.stream()
            .mapToDouble(d -> d.getCantidad() * d.getPrecioUnitario())
            .sum();
        
        pedido.setTotal(totalCalculado);
        pedido.setDetalles(detalles);
        
        Pedido guardado = pedidoService.guardarPedido(pedido);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @GetMapping("/mis-pedidos")
    public ResponseEntity<List<Pedido>> obtenerMisPedidos(Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        String telefono = normalizarTelefono(authentication.getName());
        List<Pedido> pedidos = pedidoService.listarPorTelefono(telefono);
        return ResponseEntity.ok(pedidos);
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<Pedido> cambiarEstado(@PathVariable Long id, @RequestParam String estado) {
        String estadoNormalizado = estado.toUpperCase();
        validarEstado(estadoNormalizado);

        Pedido pedidoActualizado = pedidoService.cambiarEstado(id, estadoNormalizado);
        return ResponseEntity.ok(pedidoActualizado);
    }

    @PutMapping("/{id}/pago")
    public ResponseEntity<Pedido> marcarPago(@PathVariable Long id) {
        Pedido pedido = pedidoService.obtenerPorId(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado"));

        pedido.setEstadoPago("PAGADO");
        Pedido pedidoActualizado = pedidoService.guardarPedido(pedido);
        return ResponseEntity.ok(pedidoActualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarPedido(@PathVariable Long id) {
        pedidoService.eliminarPedido(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cotizaciones")
    public ResponseEntity<List<Cotizacion>> verCotizaciones() {
        return ResponseEntity.ok(cotizacionRepository.findAll());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas() {
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

        Map<String, Double> clientes = new HashMap<>();
        pedidos.stream()
            .filter(p -> "ENTREGADO".equals(p.getEstado()))
            .forEach(p -> clientes.put(
                p.getCliente(),
                clientes.getOrDefault(p.getCliente(), 0.0) + p.getTotal()
            ));

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

    private void validarEstado(String estado) {
        if (!ESTADOS_VALIDOS.contains(estado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado inválido: " + estado);
        }
    }

    private boolean esAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private boolean esPropietario(Authentication authentication, Pedido pedido) {
        String telefonoAuth = normalizarTelefono(authentication.getName());
        String telefonoPedido = normalizarTelefono(pedido.getTelefono());
        return !telefonoAuth.isBlank() && telefonoAuth.equals(telefonoPedido);
    }

    private String normalizarTelefono(String telefono) {
        return telefono == null ? "" : telefono.replaceAll("\\D", "");
    }

    private String textoSeguro(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
