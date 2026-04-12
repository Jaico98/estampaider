package com.estampaider.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.estampaider.dto.ChangePasswordRequest;
import com.estampaider.model.Pedido;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/{telefono}/pedidos")
    public ResponseEntity<List<Pedido>> historialPedidos(@PathVariable String telefono) {
        Usuario usuario = usuarioRepository.findByTelefono(telefono)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        return ResponseEntity.ok(usuario.getPedidos());
    }

    @PutMapping("/cambiar-password")
    public ResponseEntity<?> cambiarPassword(@RequestBody ChangePasswordRequest request) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return ResponseEntity.status(401).body("Usuario no autenticado");
        }

        String telefono = authentication.getName();

        Usuario usuario = usuarioRepository.findByTelefono(telefono)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (request.getPasswordActual() == null || request.getPasswordActual().isBlank()) {
            return ResponseEntity.badRequest().body("La contraseña actual es obligatoria");
        }

        if (request.getPasswordNueva() == null || request.getPasswordNueva().isBlank()) {
            return ResponseEntity.badRequest().body("La nueva contraseña es obligatoria");
        }

        if (request.getConfirmarPassword() == null || request.getConfirmarPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Debes confirmar la nueva contraseña");
        }

        if (!passwordEncoder.matches(request.getPasswordActual(), usuario.getPassword())) {
            return ResponseEntity.badRequest().body("La contraseña actual es incorrecta");
        }

        if (!request.getPasswordNueva().equals(request.getConfirmarPassword())) {
            return ResponseEntity.badRequest().body("La confirmación no coincide con la nueva contraseña");
        }

        if (!request.getPasswordNueva().matches("^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$")) {
            return ResponseEntity.badRequest().body(
                "La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial."
            );
        }

        if (passwordEncoder.matches(request.getPasswordNueva(), usuario.getPassword())) {
            return ResponseEntity.badRequest().body("La nueva contraseña no puede ser igual a la actual");
        }

        usuario.setPassword(passwordEncoder.encode(request.getPasswordNueva()));
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "mensaje", "Contraseña actualizada correctamente"
        ));
    }
}
