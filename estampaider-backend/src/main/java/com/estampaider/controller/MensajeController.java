package com.estampaider.controller;

import com.estampaider.model.Mensaje;
import com.estampaider.repository.MensajeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/mensajes")
@CrossOrigin(origins = "*")
public class MensajeController {

    @Autowired
    private MensajeRepository mensajeRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public ResponseEntity<Mensaje> crearMensaje(@RequestBody Mensaje mensaje) {
        mensaje.setFecha(LocalDateTime.now());
        mensaje.setLeido(false);

        Mensaje guardado = mensajeRepository.save(mensaje);

        messagingTemplate.convertAndSend("/topic/mensajes", new AdminMensajeResponse(guardado));

        return ResponseEntity.ok(guardado);
    }

    @GetMapping
    public List<AdminMensajeResponse> listarMensajes() {
        return mensajeRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Mensaje::getFecha, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(AdminMensajeResponse::new)
                .toList();
    }

    @PutMapping("/{id}/leido")
    public ResponseEntity<Void> marcarLeido(@PathVariable Long id) {
        Mensaje mensaje = mensajeRepository.findById(id).orElseThrow();
        mensaje.setLeido(true);
        mensajeRepository.save(mensaje);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/no-leidos/count")
    public long contarNoLeidos() {
        return mensajeRepository.countByLeidoFalse();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        mensajeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    public static class AdminMensajeResponse {
        private Long id;
        private String nombre;
        private String correo;
        private String whatsapp;
        private String telefono;
        private String mensaje;
        private LocalDateTime fecha;
        private boolean leido;

        public AdminMensajeResponse(Mensaje mensaje) {
            this.id = mensaje.getId();
            this.nombre = mensaje.getNombre();
            this.correo = mensaje.getCorreo();
            this.whatsapp = mensaje.getWhatsapp();
            this.telefono = normalizarTelefono(mensaje.getWhatsapp());
            this.mensaje = mensaje.getMensaje();
            this.fecha = mensaje.getFecha();
            this.leido = mensaje.isLeido();
        }

        private static String normalizarTelefono(String valor) {
            if (valor == null) {
                return "";
            }

            String limpio = valor.replace("\"", "")
                    .replace("+", "")
                    .replaceAll("\\D", "")
                    .trim();

            if (limpio.isBlank()) {
                return "";
            }

            return limpio.startsWith("57") ? limpio : "57" + limpio;
        }

        public Long getId() {
            return id;
        }

        public String getNombre() {
            return nombre;
        }

        public String getCorreo() {
            return correo;
        }

        public String getWhatsapp() {
            return whatsapp;
        }

        public String getTelefono() {
            return telefono;
        }

        public String getMensaje() {
            return mensaje;
        }

        public LocalDateTime getFecha() {
            return fecha;
        }

        public boolean isLeido() {
            return leido;
        }
    }
}

