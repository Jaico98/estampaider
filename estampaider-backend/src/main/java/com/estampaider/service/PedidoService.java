package com.estampaider.service;

import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import com.estampaider.model.Pedido;
import com.estampaider.model.Usuario;
import com.estampaider.model.Rol;
import com.estampaider.repository.PedidoRepository;
import com.estampaider.repository.UsuarioRepository;

@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;

    private static final Set<String> ESTADOS_VALIDOS = Set.of(
        "RECIBIDO", "PENDIENTE", "ENVIADO", "ENTREGADO", "CANCELADO"
    );    

    public PedidoService(PedidoRepository pedidoRepository,
                         UsuarioRepository usuarioRepository) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
    }
   
    public List<Pedido> listarPorTelefono(String telefono){
        return pedidoRepository.findByUsuario_TelefonoOrderByFechaDesc(telefono);
    }
    
    /**
     * Obtener todos los pedidos
     */
    public List<Pedido> listarPedidos() {
        return pedidoRepository.findAll();
    }

    /**
     * Obtener pedidos por estado
     */
    public List<Pedido> listarPorEstado(String estado) {
        String estadoNormalizado = estado.toUpperCase();
        validarEstado(estadoNormalizado);
        return pedidoRepository.findByEstado(estadoNormalizado);
    }

    /**
     * Guardar un pedido y asociarlo a un usuario
     * Si el usuario no existe, se crea automáticamente
     */
    public Pedido guardarPedido(Pedido pedido) {

        // ✅ 1. Estado SIEMPRE primero
        if (pedido.getEstado() == null || pedido.getEstado().isBlank()) {
            pedido.setEstado("RECIBIDO");
        } else {
            String estadoNormalizado = pedido.getEstado().toUpperCase();
            validarEstado(estadoNormalizado);
            pedido.setEstado(estadoNormalizado);
        }
    
        // ✅ 2. Usuario

    if (pedido.getTelefono() != null && !pedido.getTelefono().isBlank()) {

    Usuario usuario = usuarioRepository
            .findByTelefono(pedido.getTelefono())
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Usuario no encontrado con teléfono: " + pedido.getTelefono()
            ));

    pedido.setUsuario(usuario);
}
    
        // ✅ 3. Detalles
        if (pedido.getDetalles() != null) {
            pedido.getDetalles().forEach(detalle -> {
                detalle.setPedido(pedido);
            });
        }
    
        // ✅ 4. Guardar
        return pedidoRepository.save(pedido);
    }    

    /**
     * Cambiar estado de un pedido existente
     */
    public Pedido cambiarEstado(Long id, String nuevoEstado) {

        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Pedido no encontrado con id: " + id
                        )
                );

        String estadoNormalizado = nuevoEstado.toUpperCase();
        validarEstado(estadoNormalizado);

        pedido.setEstado(estadoNormalizado);
        return pedidoRepository.save(pedido);
    }

    /**
     * Eliminar pedido
     */
    public void eliminarPedido(Long id) {

        if (!pedidoRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No se puede eliminar: pedido inexistente"
            );
        }

        pedidoRepository.deleteById(id);
    }

    public Optional<Pedido> obtenerPorId(Long id) {
        return pedidoRepository.findById(id);
    }
    

    /* ===============================
       MÉTODO PRIVADO
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
