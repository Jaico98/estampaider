package com.estampaider.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.estampaider.model.Pedido;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;

    public UsuarioController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    // 🔹 Historial de pedidos por teléfono
    @GetMapping("/{telefono}/pedidos")
    public ResponseEntity<List<Pedido>> historialPedidos(@PathVariable String telefono) {

        Usuario usuario = usuarioRepository.findByTelefono(telefono)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return ResponseEntity.ok(usuario.getPedidos());
    }
    
}
