package com.estampaider.controller;

import com.estampaider.model.Resena;
import com.estampaider.repository.ResenaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class ResenaController {

    private final ResenaRepository repository;

    public ResenaController(ResenaRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/api/resenas")
    public List<Resena> listarPublicas() {
        return repository.findAll()
                .stream()
                .sorted(Comparator.comparing(
                        Resena::getFecha,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ).reversed())
                .toList();
    }

    @PostMapping("/api/resenas")
    public ResponseEntity<?> crear(@RequestBody Resena resena) {
        String nombre = resena.getNombre() != null ? resena.getNombre().trim() : "";
        String comentario = resena.getComentario() != null ? resena.getComentario().trim() : "";
        int estrellas = resena.getEstrellas();

        if (nombre.isBlank()) {
            return ResponseEntity.badRequest().body("El nombre es obligatorio.");
        }

        if (comentario.isBlank()) {
            return ResponseEntity.badRequest().body("El comentario es obligatorio.");
        }

        if (comentario.length() < 8) {
            return ResponseEntity.badRequest().body("El comentario es demasiado corto.");
        }

        if (estrellas < 1 || estrellas > 5) {
            return ResponseEntity.badRequest().body("La puntuación debe estar entre 1 y 5.");
        }

        Resena nueva = new Resena();
        nueva.setNombre(nombre);
        nueva.setComentario(comentario);
        nueva.setEstrellas(estrellas);
        nueva.setFecha(LocalDateTime.now());

        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(nueva));
    }

    @GetMapping("/api/resenas/admin")
    public ResponseEntity<?> listarAdmin() {
        if (!esAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado.");
        }

        List<Resena> lista = repository.findAll()
                .stream()
                .sorted(Comparator.comparing(
                        Resena::getFecha,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ).reversed())
                .toList();

        return ResponseEntity.ok(lista);
    }

    @PutMapping("/api/resenas/{id}/respuesta")
    public ResponseEntity<?> responder(@PathVariable Long id, @RequestBody Map<String, String> body) {
        if (!esAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado.");
        }

        return repository.findById(id)
                .map(resena -> {
                    String respuesta = body.get("respuesta") != null ? body.get("respuesta").trim() : "";

                    if (respuesta.isBlank()) {
                        return ResponseEntity.badRequest().body("La respuesta no puede estar vacía.");
                    }

                    resena.setRespuestaAdmin(respuesta);
                    resena.setFechaRespuestaAdmin(LocalDateTime.now());
                    repository.save(resena);

                    return ResponseEntity.ok(resena);
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Reseña no encontrada."));
    }

    @DeleteMapping("/api/resenas/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        if (!esAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado.");
        }

        if (!repository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Reseña no encontrada.");
        }

        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private boolean esAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }

        return auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}