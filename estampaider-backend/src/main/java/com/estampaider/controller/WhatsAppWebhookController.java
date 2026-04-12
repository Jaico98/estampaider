package com.estampaider.controller;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.Cotizacion;
import com.estampaider.model.Producto;
import com.estampaider.repository.ChatMensajeRepository;
import com.estampaider.repository.CotizacionRepository;
import com.estampaider.repository.ProductoRepository;
import com.estampaider.service.OpenAIService;
import com.estampaider.service.WhatsAppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/webhook")
public class WhatsAppWebhookController {

    @Value("${whatsapp.verify.token}")
    private String verifyToken;

    @Value("${whatsapp.phone.number.id}")
    private String phoneNumberId;

    @Value("${whatsapp.access.token}")
    private String accessToken;

    @Value("${asesor.telefono:573153625992}")
    private String asesorTelefono;

    @Autowired
    private WhatsAppService whatsAppService;

    @Autowired
    private CotizacionRepository cotizacionRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMensajeRepository chatRepo;

    @Autowired
    private OpenAIService openAIService;

    private final Map<String, String> userState = new ConcurrentHashMap<>();
    private final Map<String, Cotizacion> cotizaciones = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<String> verifyWebhook(
        @RequestParam(name = "hub.mode", required = false) String mode,
        @RequestParam(name = "hub.verify_token", required = false) String token,
        @RequestParam(name = "hub.challenge", required = false) String challenge
    ) {
        if ("subscribe".equals(mode) && verifyToken != null && verifyToken.equals(token)) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(403).body("Token inválido");
    }

    @PostMapping
    public String receiveMessage(@RequestBody Map<String, Object> payload) {
        try {
            Map<String, Object> entry = getMap(getList(payload, "entry"), 0);
            Map<String, Object> changes = getMap(getList(entry, "changes"), 0);
            Map<String, Object> value = getMap(changes, "value");

            if (!value.containsKey("messages")) {
                return "EVENT_RECEIVED";
            }

            Map<String, Object> message = getMap(getList(value, "messages"), 0);
            String from = texto(getValue(message, "from"));
            String body = extraerBody(message);

            if (from.isBlank() || body.isBlank()) {
                return "EVENT_RECEIVED";
            }

            System.out.println("Mensaje recibido de " + from + ": " + body);

            guardarMensajeCliente(from, body);
            manejarFlujo(from, body);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return "EVENT_RECEIVED";
    }

    private void manejarFlujo(String from, String body) {
        if (body.equals("hola") || body.equals("menu") || body.equals("inicio")) {
            enviarMenuBotones(from);
            return;
        }

        if (body.equals("productos") || body.contains("producto")) {
            userState.put(from, "SELECCION_PRODUCTO");
            cotizaciones.put(from, new Cotizacion());
            enviarCatalogoProductos(from);
            return;
        }

        if ("SELECCION_PRODUCTO".equals(userState.get(from))) {
            manejarSeleccionProducto(from, body);
            return;
        }

        if ("CANTIDAD".equals(userState.get(from))) {
            manejarCantidad(from, body);
            return;
        }

        if ("ESTAMPADO".equals(userState.get(from))) {
            manejarEstampado(from, body);
            return;
        }

        if ("CONFIRMAR".equals(userState.get(from))) {
            manejarConfirmacion(from, body);
            return;
        }

        if (body.equals("asesor") || body.contains("asesor")) {
            conectarAsesor(from);
            return;
        }

        String respuestaAI = openAIService.preguntar(body);
        enviarMensaje(from, respuestaAI);
    }

    private void manejarSeleccionProducto(String from, String body) {
        List<Producto> productos = productoRepository.findAll();

        if (!body.matches("\\d+")) {
            enviarMensaje(from, "⚠️ Ingresa el número del producto.\nEjemplo: 1");
            return;
        }

        int index = Integer.parseInt(body) - 1;
        if (index < 0 || index >= productos.size()) {
            enviarMensaje(from, "❌ Número inválido.");
            return;
        }

        Producto producto = productos.get(index);
        Cotizacion cotizacion = cotizaciones.computeIfAbsent(from, k -> new Cotizacion());

        cotizacion.setProducto(producto.getNombre());
        cotizacion.setPrecio(producto.getPrecio());

        enviarMensaje(from, "Perfecto \n\n¿Cuántas unidades necesitas?");
        userState.put(from, "CANTIDAD");
    }

    private void manejarCantidad(String from, String body) {
        if (!body.matches("\\d+")) {
            enviarMensaje(from, "⚠️ Ingresa solo números.\nEjemplo: 10");
            return;
        }

        Cotizacion cotizacion = cotizaciones.get(from);
        if (cotizacion == null) {
            reiniciarConversacion(from, "Se perdió el contexto. Escribe *productos* para comenzar de nuevo.");
            return;
        }

        cotizacion.setCantidad(body);

        int cantidad = Integer.parseInt(body);
        double total = cotizacion.getPrecio() * cantidad;
        cotizacion.setTotal(total);

        String totalFormat = String.format("%,.0f", total);

        enviarMensaje(
            from,
            " Subtotal: $" + totalFormat + "\n\n" +
            "¿Qué tipo de estampado deseas?\n\n" +
            "• DTF\n• Sublimado\n• Bordado"
        );

        userState.put(from, "ESTAMPADO");
    }

    private void manejarEstampado(String from, String body) {
        if (!body.equals("dtf") && !body.equals("sublimado") && !body.equals("bordado")) {
            enviarMensaje(from, "⚠️ Escribe: DTF, Sublimado o Bordado");
            return;
        }

        Cotizacion cotizacion = cotizaciones.get(from);
        if (cotizacion == null) {
            reiniciarConversacion(from, "Se perdió el contexto. Escribe *productos* para comenzar de nuevo.");
            return;
        }

        cotizacion.setEstampado(body);
        cotizacion.setTelefono(from);

        int cantidad = Integer.parseInt(cotizacion.getCantidad());
        double total = cotizacion.getPrecio() * cantidad;
        String totalFormat = String.format("%,.0f", total);

        enviarMensaje(
            from,
            " *Resumen de tu pedido*\n\n" +
            " " + cotizacion.getProducto() + "\n" +
            " Cantidad: " + cantidad + "\n" +
            " Estampado: " + body + "\n" +
            " Total: $" + totalFormat + "\n\n" +
            "✅ Escribe *confirmar*\n❌ o *cancelar*"
        );

        userState.put(from, "CONFIRMAR");
    }

    private void manejarConfirmacion(String from, String body) {
        Cotizacion cotizacion = cotizaciones.get(from);
        if (cotizacion == null) {
            reiniciarConversacion(from, "Se perdió el contexto. Escribe *productos* para comenzar de nuevo.");
            return;
        }

        if (!body.equals("confirmar")) {
            enviarMensaje(from, "❌ Pedido cancelado");
            userState.remove(from);
            cotizaciones.remove(from);
            return;
        }

        LocalDateTime ahora = LocalDateTime.now();
        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter formatoHora = DateTimeFormatter.ofPattern("hh:mm a");

        String fecha = ahora.format(formatoFecha);
        String hora = ahora.format(formatoHora);

        int cantidad = Integer.parseInt(cotizacion.getCantidad());
        double total = cotizacion.getPrecio() * cantidad;
        String totalFormat = String.format("%,.0f", total);

        cotizacion.setFecha(LocalDateTime.now());
        cotizacionRepository.save(cotizacion);

        enviarMensaje(
            from,
            " Pedido confirmado\n\n" +
            " Fecha: " + fecha + "\n" +
            "⏰ Hora: " + hora + "\n\n" +
            "Un asesor te contactará "
        );

        String mensajeAsesor =
            " *NUEVO PEDIDO LISTO PARA CERRAR* \n\n" +
            " Fecha: " + fecha + "\n" +
            "⏰ Hora: " + hora + "\n\n" +
            " Cliente: " + from + "\n" +
            " Producto: " + cotizacion.getProducto() + "\n" +
            " Cantidad: " + cantidad + "\n" +
            " Estampado: " + cotizacion.getEstampado() + "\n" +
            " Total: $" + totalFormat + "\n\n" +
            "⚡ Contactar cliente de inmediato";

        whatsAppService.enviarMensaje(asesorTelefono, mensajeAsesor);
        whatsAppService.enviarMensaje(asesorTelefono, " Contactar cliente: https://wa.me/" + from);

        userState.remove(from);
        cotizaciones.remove(from);
    }

    private void conectarAsesor(String from) {
        LocalDateTime ahora = LocalDateTime.now();
        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter formatoHora = DateTimeFormatter.ofPattern("hh:mm a");

        String fecha = ahora.format(formatoFecha);
        String hora = ahora.format(formatoHora);

        enviarMensaje(
            from,
            "‍ Un asesor te contactará en breve ✨\n\n" +
            "Gracias por confiar en *Estampaider* "
        );

        String mensajeAsesor =
            " *Nuevo cliente solicita asesor*\n\n" +
            " Número: " + from + "\n\n" +
            "⏰ Hora: " + hora + "\n" +
            " Fecha: " + fecha + "\n";

        whatsAppService.enviarMensaje(asesorTelefono, mensajeAsesor);
        whatsAppService.enviarMensaje(asesorTelefono, " Contactar cliente: https://wa.me/" + from);
    }

    private void guardarMensajeCliente(String from, String body) {
        ChatMensaje chat = new ChatMensaje();
        chat.setNombre("Cliente");
        chat.setMensaje(body);
        chat.setTelefono(from);
        chat.setTipo("CLIENTE");
        chat.setFecha(Instant.now());

        chatRepo.save(chat);
        messagingTemplate.convertAndSend("/topic/chat/" + from, chat);
    }

    private void enviarMensaje(String to, String mensaje) {
        whatsAppService.enviarMensaje(to, mensaje);
    }

    private void enviarMenuBotones(String numero) {
        String mensaje =
            "👋 Hola, bienvenido a *Estampaider*.\n\n" +
            "¿Cómo podemos ayudarte hoy?\n\n" +
            "• Escribe *productos* para ver el catálogo\n" +
            "• Escribe *asesor* para hablar con un asesor\n" +
            "• O escribe tu consulta y te responderemos";
        enviarMensaje(numero, mensaje);
    }

    private void enviarCatalogoProductos(String numero) {
        List<Producto> productos = productoRepository.findAll();

        if (productos.isEmpty()) {
            enviarMensaje(numero, "En este momento no hay productos disponibles.");
            return;
        }

        StringBuilder mensaje = new StringBuilder();
        mensaje.append("️ *Catálogo Estampaider*\n\n");

        int contador = 1;
        for (Producto p : productos) {
            String precio = String.format("%,.0f", p.getPrecio());
            mensaje.append(contador)
                .append(". ")
                .append(p.getNombre())
                .append(" — $")
                .append(precio)
                .append("\n");
            contador++;
        }

        mensaje.append("\nEscribe el número del producto que deseas cotizar.");
        enviarMensaje(numero, mensaje.toString());
    }

    private void reiniciarConversacion(String from, String mensaje) {
        userState.remove(from);
        cotizaciones.remove(from);
        enviarMensaje(from, mensaje);
    }

    @SuppressWarnings("unchecked")
    private List<Object> getList(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof List<?> list ? (List<Object>) list : List.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(List<Object> list, int index) {
        if (index < 0 || index >= list.size()) {
            return Map.of();
        }
        Object value = list.get(index);
        return value instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    private Object getValue(Map<String, Object> map, String key) {
        return map.getOrDefault(key, "");
    }

    private String texto(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String extraerBody(Map<String, Object> message) {
        if (message.containsKey("interactive")) {
            Map<String, Object> interactive = getMap(message, "interactive");
            if (interactive.containsKey("button_reply")) {
                Map<String, Object> buttonReply = getMap(interactive, "button_reply");
                return texto(buttonReply.get("id")).toLowerCase();
            }
        }

        if (message.containsKey("text")) {
            Map<String, Object> textObj = getMap(message, "text");
            return texto(textObj.get("body")).toLowerCase();
        }

        return "";
    }
}