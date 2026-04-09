package com.estampaider.controller;

import com.estampaider.model.Mensaje;
import com.estampaider.repository.MensajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.LocalDateTime;
import java.util.List;


@RestController
@RequestMapping("/api/mensajes")
@CrossOrigin(origins = "*")
public class MensajeController {

    @Autowired
    private MensajeRepository mensajeRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 📩 CREAR MENSAJE (CONTACTO)
    @PostMapping
    public ResponseEntity<Mensaje> crearMensaje(@RequestBody Mensaje mensaje) {

    mensaje.setFecha(LocalDateTime.now());
    mensaje.setLeido(false);

    Mensaje guardado = mensajeRepository.save(mensaje);

    // 🚀 NOTIFICACIÓN EN TIEMPO REAL
    messagingTemplate.convertAndSend("/topic/mensajes", guardado);

    return ResponseEntity.ok(guardado);
}

    // 📋 LISTAR MENSAJES (ADMIN)
    @GetMapping
    public List<Mensaje> listarMensajes() {
        return mensajeRepository.findAll();
    }

    // ✅ MARCAR COMO LEÍDO
    @PutMapping("/{id}/leido")
    public ResponseEntity<Void> marcarLeido(@PathVariable Long id) {
        Mensaje mensaje = mensajeRepository.findById(id).orElseThrow();
        mensaje.setLeido(true);
        mensajeRepository.save(mensaje);
        return ResponseEntity.ok().build();
    }

    // 🔢 CONTAR NO LEÍDOS
    @GetMapping("/no-leidos/count")
    public long contarNoLeidos() {
        return mensajeRepository.countByLeidoFalse();
    }

    // 🗑️ ELIMINAR
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        mensajeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}

