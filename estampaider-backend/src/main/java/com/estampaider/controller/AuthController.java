package com.estampaider.controller;

import com.estampaider.dto.LoginRequest;
import com.estampaider.dto.LoginResponse;
import com.estampaider.dto.RegisterRequest;
import com.estampaider.model.Rol;
import com.estampaider.model.Usuario;
import com.estampaider.repository.UsuarioRepository;
import com.estampaider.security.JwtService;
import com.estampaider.service.WhatsAppService;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final WhatsAppService whatsAppService;

    public AuthController(
            UsuarioRepository usuarioRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            WhatsAppService whatsAppService) {
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.whatsAppService = whatsAppService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (usuarioRepository.existsByTelefono(request.getTelefono())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El teléfono ya está registrado");
        }

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setNombre(request.getNombre());
        nuevoUsuario.setTelefono(request.getTelefono());
        nuevoUsuario.setRol(Rol.CLIENTE);
        nuevoUsuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuarioRepository.save(nuevoUsuario);

        String token = jwtService.generateToken(nuevoUsuario.getTelefono(), nuevoUsuario.getRol().name());
        LoginResponse response = new LoginResponse(
                true,
                nuevoUsuario.getRol().name(),
                nuevoUsuario.getNombre(),
                nuevoUsuario.getTelefono(),
                token);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Usuario usuario = usuarioRepository.findByTelefono(request.getUsuario()).orElse(null);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario no encontrado");
        }

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas");
        }

        String token = jwtService.generateToken(usuario.getTelefono(), usuario.getRol().name());
        LoginResponse response = new LoginResponse(
                true,
                usuario.getRol().name(),
                usuario.getNombre(),
                usuario.getTelefono(),
                token);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-code")
    public ResponseEntity<?> sendCode(@RequestBody Map<String, String> request) {
        String telefono = request.get("telefono");
        if (telefono == null || telefono.isBlank()) {
            return ResponseEntity.badRequest().body("Teléfono requerido");
        }

        Optional<Usuario> optionalUsuario = usuarioRepository.findByTelefono(telefono);
        if (optionalUsuario.isEmpty()) {
            return ResponseEntity.ok("Si el número existe, se enviará un código.");
        }

        Usuario usuario = optionalUsuario.get();
        String codigo = String.valueOf((int) (Math.random() * 900000) + 100000);

        usuario.setRecoveryCode(codigo);
        usuario.setRecoveryCodeExpiration(LocalDateTime.now().plusMinutes(5));
        usuarioRepository.save(usuario);

        try {
            whatsAppService.enviarCodigoRecuperacion(telefono, codigo);
            return ResponseEntity.ok("Código enviado por WhatsApp correctamente.");
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("No se pudo enviar el código por WhatsApp. Verifica la configuración del token y del número.");
        }
    }

    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> request) {
        String telefono = request.get("telefono");
        String codigo = request.get("codigo");

        Optional<Usuario> optionalUsuario = usuarioRepository.findByTelefono(telefono);
        if (optionalUsuario.isEmpty()) {
            return ResponseEntity.badRequest().body("Usuario no encontrado");
        }

        Usuario usuario = optionalUsuario.get();
        if (usuario.getRecoveryCode() == null
                || !usuario.getRecoveryCode().equals(codigo)
                || usuario.getRecoveryCodeExpiration() == null
                || usuario.getRecoveryCodeExpiration().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("Código inválido o expirado");
        }

        return ResponseEntity.ok("Código válido");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String telefono = request.get("telefono");
        String codigo = request.get("codigo");
        String nuevaPassword = request.get("password");

        Optional<Usuario> optionalUsuario = usuarioRepository.findByTelefono(telefono);
        if (optionalUsuario.isEmpty()) {
            return ResponseEntity.badRequest().body("Usuario no encontrado");
        }

        Usuario usuario = optionalUsuario.get();
        if (usuario.getRecoveryCode() == null
                || !usuario.getRecoveryCode().equals(codigo)
                || usuario.getRecoveryCodeExpiration() == null
                || usuario.getRecoveryCodeExpiration().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("Código inválido o expirado");
        }

        if (!nuevaPassword.matches("^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$")) {
            return ResponseEntity.badRequest().body(
                    "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.");
        }

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuario.setRecoveryCode(null);
        usuario.setRecoveryCodeExpiration(null);
        usuarioRepository.save(usuario);

        return ResponseEntity.ok("Contraseña actualizada correctamente");
    }
}
