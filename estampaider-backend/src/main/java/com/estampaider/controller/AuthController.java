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
        WhatsAppService whatsAppService
    ) {
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
        if (request.getCorreo() == null || request.getCorreo().isBlank()) {
            return ResponseEntity.badRequest().body("El correo es obligatorio");
        }
        
        if (usuarioRepository.findByCorreo(request.getCorreo()).isPresent()) {
            return ResponseEntity.badRequest().body("Ya existe un usuario con ese correo");
        }

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setNombre(request.getNombre());
        nuevoUsuario.setCorreo(request.getCorreo());
        nuevoUsuario.setTelefono(request.getTelefono());
        nuevoUsuario.setRol(Rol.CLIENTE);
        nuevoUsuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuarioRepository.save(nuevoUsuario);

        String token = jwtService.generateToken(nuevoUsuario.getTelefono(), nuevoUsuario.getRol().name());
        LoginResponse response = new LoginResponse(
            true,
            nuevoUsuario.getRol().name(),
            nuevoUsuario.getNombre(),
            nuevoUsuario.getCorreo(),
            nuevoUsuario.getTelefono(),
            token
    );

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
            usuario.getCorreo(),
            usuario.getTelefono(),
            token
    );

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

        try {
            Usuario usuario = optionalUsuario.get();

            String codigo = String.valueOf((int) (Math.random() * 900000) + 100000);

            usuario.setRecoveryCode(codigo);
            usuario.setRecoveryCodeExpiration(LocalDateTime.now().plusMinutes(5));
            usuarioRepository.save(usuario);

            System.out.println("=== RECOVERY DEBUG ===");
            System.out.println("Usuario encontrado: " + usuario.getNombre());
            System.out.println("Telefono BD: " + usuario.getTelefono());
            System.out.println("Telefono request: " + telefono);
            System.out.println("Codigo generado: " + codigo);

            whatsAppService.enviarCodigoRecuperacion(usuario.getTelefono(), codigo);

            return ResponseEntity.ok("Código enviado por WhatsApp");
        } catch (IllegalStateException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("La integración de WhatsApp no está configurada correctamente.");
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("WhatsApp rechazó el envío del código. Verifica token y phone number id.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error interno enviando el código.");
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
