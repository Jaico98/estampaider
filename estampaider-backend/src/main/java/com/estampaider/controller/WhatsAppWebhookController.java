package com.estampaider.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import java.util.List;

import com.estampaider.model.ChatMensaje;
import com.estampaider.model.Cotizacion;
import com.estampaider.repository.ChatMensajeRepository;
import com.estampaider.repository.CotizacionRepository;
import com.estampaider.service.OpenAIService;
import com.estampaider.service.WhatsAppService;

import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;

import com.estampaider.model.Producto;
import com.estampaider.repository.ProductoRepository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/webhook")
public class WhatsAppWebhookController {

    private final String VERIFY_TOKEN = "estampaider_token_123";

    @Value("${whatsapp.access.token}")
    private String accessToken;

    @Value("${whatsapp.phone.number.id}")
    private String phoneNumberId;

    @Autowired
    private WhatsAppService whatsAppService;

    private Map<String, String> userState = new ConcurrentHashMap<>();
    private Map<String, Cotizacion> cotizaciones = new ConcurrentHashMap<>();

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

    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge
    ) {

        if ("subscribe".equals(mode) && VERIFY_TOKEN.equals(token)) {
            return ResponseEntity.ok(challenge);
        }

        return ResponseEntity.status(403).body("Token inválido");
    }

    @PostMapping
    public String receiveMessage(@RequestBody Map<String, Object> payload) {

        try {

            Map<String, Object> entry =
                    (Map<String, Object>) ((List<?>) payload.get("entry")).get(0);

            Map<String, Object> changes =
                    (Map<String, Object>) ((List<?>) entry.get("changes")).get(0);

            Map<String, Object> value =
                    (Map<String, Object>) changes.get("value");

            if (value.containsKey("messages")) {

                Map<String, Object> message =
                        (Map<String, Object>) ((List<?>) value.get("messages")).get(0);

                String from = (String) message.get("from");

                String body = "";

                if (message.containsKey("interactive")) {

                    Map<String, Object> interactive =
                            (Map<String, Object>) message.get("interactive");

                    if (interactive.containsKey("button_reply")) {

                        Map<String, Object> buttonReply =
                                (Map<String, Object>) interactive.get("button_reply");

                        body = ((String) buttonReply.get("id")).toLowerCase().trim();
                    }

                } else if (message.containsKey("text")) {

                    Map<String, Object> textObj =
                            (Map<String, Object>) message.get("text");

                    body = ((String) textObj.get("body")).toLowerCase().trim();
                }

                System.out.println("Mensaje recibido de " + from + ": " + body);

                if (body != null && !body.isEmpty()) {
                ChatMensaje chat = new ChatMensaje();
                chat.setNombre("Cliente");
                chat.setMensaje(body);
                chat.setTelefono(from);
                chat.setTipo("CLIENTE");
                chat.setFecha(Instant.now());
                
                chatRepo.save(chat);
                
                messagingTemplate.convertAndSend(
                    "/topic/chat/" + from,
                    chat
                );                
            }
                // 🔹 MENÚ
                if (body.equals("hola") || body.equals("menu") || body.equals("inicio")) {

                    enviarMenuBotones(from);
                }

                // 🔹 PRODUCTOS
                else if (body.equals("productos") || body.contains("producto")) {

                    userState.put(from, "SELECCION_PRODUCTO");

                    Cotizacion cotizacion = new Cotizacion();
                    cotizaciones.put(from, cotizacion);

                    enviarCatalogoProductos(from);
                }

                // 🔹 SELECCIÓN PRODUCTO
                else if ("SELECCION_PRODUCTO".equals(userState.get(from))) {

                    List<Producto> productos = productoRepository.findAll();

                    if (!body.matches("\\d+")) {
                        enviarMensaje(from, "⚠️ Ingresa el número del producto.\nEjemplo: 1");
                        return "EVENT_RECEIVED";
                    }

                    int index = Integer.parseInt(body) - 1;

                    if (index < 0 || index >= productos.size()) {
                        enviarMensaje(from, "❌ Número inválido.");
                        return "EVENT_RECEIVED";
                    }

                    Producto producto = productos.get(index);

                    Cotizacion cotizacion = cotizaciones.get(from);
                    cotizacion.setProducto(producto.getNombre());
                    cotizacion.setPrecio(producto.getPrecio());

                    enviarMensaje(from, "Perfecto 👍\n\n¿Cuántas unidades necesitas?");

                    userState.put(from, "CANTIDAD");
                }

                // 🔹 CANTIDAD
                else if ("CANTIDAD".equals(userState.get(from))) {

                    if (!body.matches("\\d+")) {
                        enviarMensaje(from, "⚠️ Ingresa solo números.\nEjemplo: 10");
                        return "EVENT_RECEIVED";
                    }

                    Cotizacion cotizacion = cotizaciones.get(from);
                    cotizacion.setCantidad(body);

                    int cantidad = Integer.parseInt(body);
                    double total = cotizacion.getPrecio() * cantidad;
                    cotizacion.setTotal(total);

                    String totalFormat = String.format("%,.0f", total);

                    enviarMensaje(from,
                            "💰 Subtotal: $" + totalFormat + "\n\n" +
                            "¿Qué tipo de estampado deseas?\n\n" +
                            "• DTF\n• Sublimado\n• Bordado");

                    userState.put(from, "ESTAMPADO");
                }

                // 🔹 ESTAMPADO
                else if ("ESTAMPADO".equals(userState.get(from))) {

                    if (!body.equals("dtf") &&
                        !body.equals("sublimado") &&
                        !body.equals("bordado")) {

                        enviarMensaje(from, "⚠️ Escribe: DTF, Sublimado o Bordado");
                        return "EVENT_RECEIVED";
                    }

                    Cotizacion cotizacion = cotizaciones.get(from);

                    cotizacion.setEstampado(body);
                    cotizacion.setTelefono(from);

                    int cantidad = Integer.parseInt(cotizacion.getCantidad());
                    double total = cotizacion.getPrecio() * cantidad;

                    String totalFormat = String.format("%,.0f", total);

                    enviarMensaje(from,
                            "🛒 *Resumen de tu pedido*\n\n" +
                            "👕 " + cotizacion.getProducto() + "\n" +
                            "📦 Cantidad: " + cantidad + "\n" +
                            "🖨 Estampado: " + body + "\n" +
                            "💰 Total: $" + totalFormat + "\n\n" +
                            "✅ Escribe *confirmar*\n❌ o *cancelar*");

                    userState.put(from, "CONFIRMAR");
                }

// 🔹 CONFIRMAR
else if ("CONFIRMAR".equals(userState.get(from))) {

        Cotizacion cotizacion = cotizaciones.get(from);
    
        if (body.equals("confirmar")) {
    
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
    
            enviarMensaje(from,
                    "🎉 Pedido confirmado\n\n" +
                    "📅 Fecha: " + fecha + "\n" +
                    "⏰ Hora: " + hora + "\n\n" +
                    "Un asesor te contactará 🙌");
    
            String asesor = "573153625992";
    
            String mensajeAsesor =
                    "🚨 *NUEVO PEDIDO LISTO PARA CERRAR* 🚨\n\n" +
                    "📅 Fecha: " + fecha + "\n" +
                    "⏰ Hora: " + hora + "\n\n" +
                    "📱 Cliente: " + from + "\n" +
                    "👕 Producto: " + cotizacion.getProducto() + "\n" +
                    "📦 Cantidad: " + cantidad + "\n" +
                    "🖨 Estampado: " + cotizacion.getEstampado() + "\n" +
                    "💰 Total: $" + totalFormat + "\n\n" +
                    "⚡ Contactar cliente de inmediato";
    
            whatsAppService.enviarMensaje(asesor, mensajeAsesor);
    
            String linkDirecto = "https://wa.me/" + from;
    
            whatsAppService.enviarMensaje(asesor,
                    "🔗 Contactar cliente: " + linkDirecto);
    
            userState.remove(from);
            cotizaciones.remove(from);
    
        } else {
    
            enviarMensaje(from, "❌ Pedido cancelado");
    
            userState.remove(from);
            cotizaciones.remove(from);
        }
    }

                // 🔹 ASESOR
                else if (body.equals("asesor") || body.contains("asesor")) {

                        LocalDateTime ahora = LocalDateTime.now();

                        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                        DateTimeFormatter formatoHora = DateTimeFormatter.ofPattern("hh:mm a");
    
                        String fecha = ahora.format(formatoFecha);
                        String hora = ahora.format(formatoHora);

                        enviarMensaje(from,
                                "👨‍💼 Un asesor te contactará en breve 📞✨\n\n" +
                                "Gracias por confiar en *Estampaider* 🙌");
                    
                        String asesor = "573153625992";
                    
                        String mensajeAsesor =
                                "📢 *Nuevo cliente solicita asesor*\n\n" +
                                "📱 Número: " + from + "\n\n"+

                                "⏰ Hora: " + hora + "\n" +
                                "📅 Fecha: " + fecha + "\n" ;
                    
                        whatsAppService.enviarMensaje(asesor, mensajeAsesor);

                        String linkDirecto = "https://wa.me/" + from;

                        whatsAppService.enviarMensaje(asesor,
                        "🔗 Contactar cliente: " + linkDirecto);
                    }

                // 🔹 IA
                else {

                    if (body != null && !body.isEmpty()) {
                        String respuestaAI = openAIService.preguntar(body);
                        enviarMensaje(from, respuestaAI);
                    }
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return "EVENT_RECEIVED";
    }


    private void enviarMensaje(String to, String mensaje) {
        whatsAppService.enviarMensaje(to, mensaje);
    }

    private void enviarCatalogoProductos(String numero) {

        List<Producto> productos = productoRepository.findAll();

        StringBuilder mensaje = new StringBuilder();

        mensaje.append("🛍️ *Catálogo Estampaider*\n\n");

        int contador = 1;

        for (Producto p : productos) {

            String precio = String.format("%,.0f", p.getPrecio());

            mensaje.append(contador).append(". ").append(p.getNombre()).append("\n");
            mensaje.append("💰 $").append(precio).append("\n\n");

            contador++;
        }

        mensaje.append("📲 Responde con el número del producto\n");
        mensaje.append("Ejemplo: 1");

        enviarMensaje(numero, mensaje.toString());
    }

    public void enviarMenuBotones(String numero) {

        String url = "https://graph.facebook.com/v18.0/" + phoneNumberId + "/messages";

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> boton1 = Map.of(
                "type", "reply",
                "reply", Map.of("id", "productos", "title", "Productos")
        );

        Map<String, Object> boton2 = Map.of(
                "type", "reply",
                "reply", Map.of("id", "asesor", "title", "Asesor")
        );

        Map<String, Object> interactive = Map.of(
                "type", "button",
                "body", Map.of(
                        "text", "👋 Bienvenido a *Estampaider*\nSelecciona una opción:"
                ),
                "action", Map.of(
                        "buttons", List.of(boton1, boton2)
                )
        );

        Map<String, Object> requestBody = Map.of(
                "messaging_product", "whatsapp",
                "to", numero,
                "type", "interactive",
                "interactive", interactive
        );

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(requestBody, headers);

        restTemplate.postForEntity(url, request, String.class);
    }
}