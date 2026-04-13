const authData = sessionStorage.getItem("auth")
  ? JSON.parse(sessionStorage.getItem("auth"))
  : null;

if (!authData || !authData.token) {
  window.location.href = "admin/login.html";
}

const API_BASE = resolverApiBase();
let stompClient = null;
let telefonoCliente = null;
let reconnectTimer = null;

function resolverApiBase() {
  const configurada = window.API_BASE_URL || window.__API_BASE__;
  if (configurada) {
    return String(configurada).replace(/\/$/, "");
  }

  const { protocol, hostname, port, host } = window.location;

  if (protocol === "file:") {
    return "http://localhost:8080";
  }

  const esLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (esLocal && port && port !== "8080") {
    return `${protocol}//${hostname}:8080`;
  }

  return `${protocol}//${host}`;
}

function textoSeguro(valor) {
  return String(valor ?? "");
}

function escapeHtml(valor) {
  return textoSeguro(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function volver() {
  window.location.href = "index.html";
}

function irLogin() {
  window.location.href = "admin/login.html";
}

function cerrarSesion() {
  sessionStorage.removeItem("auth");
  window.location.href = "index.html";
}

function checklistEstado(estado) {
  const estados = [
    { key: "RECIBIDO", label: "Recibido" },
    { key: "PENDIENTE", label: "En proceso" },
    { key: "ENVIADO", label: "Enviado" },
    { key: "ENTREGADO", label: "Entregado" },
  ];

  const actual = estados.findIndex((e) => e.key === estado);

  return `
    <div class="estado-checklist">
      ${estados
        .map(
          (e, index) =>
            `<span class="${index <= actual ? "activo" : ""}">${e.label}</span>`
        )
        .join("")}
    </div>
  `;
}

function formatearHora(fechaIso) {
  const fecha = fechaIso ? new Date(fechaIso) : new Date();
  return fecha.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estadoChat(texto) {
  const badge =
    document.querySelector(".mis-pedidos-chat-badge") ||
    document.querySelector(".chat-badge");

  if (badge) {
    badge.textContent = texto;
  }
}

function crearBurbujaMensaje(texto, tipo, fecha, id) {
  const div = document.createElement("div");

  if (id) div.dataset.id = id;
  div.className = tipo === "CLIENTE" ? "msg-cliente" : "msg-admin";

  const contenido = document.createElement("div");
  contenido.textContent = textoSeguro(texto);

  const meta = document.createElement("span");
  meta.className = "msg-meta";
  meta.textContent = formatearHora(fecha);

  div.append(contenido, meta);
  return div;
}

function agregarMensaje(msg) {
  const chatBox = document.getElementById("chat-mensajes");
  if (!chatBox || !msg || !msg.mensaje) return;
  if (msg.id && chatBox.querySelector(`[data-id="${msg.id}"]`)) return;
  if (msg.tipo === "RECIBIDO" || msg.tipo === "LEIDO") return;

  quitarTypingCliente();

  const burbuja = crearBurbujaMensaje(msg.mensaje, msg.tipo, msg.fecha, msg.id);
  chatBox.appendChild(burbuja);
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth",
  });
}

function agregarMensajeSistema(texto, metaTexto = "Ahora") {
  const chatBox = document.getElementById("chat-mensajes");
  if (!chatBox) return;

  const div = document.createElement("div");
  div.className = "msg-admin";

  const contenido = document.createElement("div");
  contenido.textContent = texto;

  const meta = document.createElement("span");
  meta.className = "msg-meta";
  meta.textContent = metaTexto;

  div.append(contenido, meta);
  chatBox.appendChild(div);
}

function quitarTypingCliente() {
  document.getElementById("typing-cliente")?.remove();
}

async function cargarHistorial() {
  const chatBox = document.getElementById("chat-mensajes");
  if (!chatBox || !telefonoCliente) return;

  chatBox.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/api/chat/${telefonoCliente}`);
    if (!res.ok) return;

    const historial = await res.json();

    if (!historial.length) {
      agregarMensajeSistema(
        "Hola, soy el soporte de Estampaider 👋 Cuéntanos en qué podemos ayudarte con tu pedido.",
        "Ahora"
      );
      return;
    }

    historial.forEach(agregarMensaje);
  } catch (error) {
    console.error("Error cargando historial:", error);
    agregarMensajeSistema(
      "No pudimos cargar el historial del chat. Puedes escribirnos de todos modos.",
      "Aviso"
    );
  }
}

function conectarChat() {
  if (!authData?.telefono) {
    const chatSection = document.getElementById("chat-section");
    if (chatSection) {
      chatSection.innerHTML = `
        <div style="padding:24px">
          <p>Para usar el chat debes iniciar sesión nuevamente.</p>
          <button class="btn btn-primario" onclick="irLogin()">Iniciar sesión</button>
        </div>
      `;
    }
    return;
  }

  telefonoCliente = authData.telefono.toString().replace(/\D/g, "");
  if (!telefonoCliente.startsWith("57")) {
    telefonoCliente = `57${telefonoCliente}`;
  }

  estadoChat("Conectando...");

  const socket = new SockJS(`${API_BASE}/ws`);
  stompClient = Stomp.over(socket);
  stompClient.debug = () => {};

  stompClient.connect(
    {},
    async () => {
      clearTimeout(reconnectTimer);
      estadoChat("Chat activo");

      const btn = document.getElementById("btn-enviar");
      if (btn) btn.disabled = false;

      stompClient.subscribe(`/topic/chat/${telefonoCliente}`, (frame) => {
        const data = JSON.parse(frame.body);
        agregarMensaje(data);
      });

      stompClient.subscribe(`/topic/chat/${telefonoCliente}/typing`, (frame) => {
        let data;
        try {
          data = JSON.parse(frame.body);
        } catch {
          data = { tipo: frame.body, telefono: telefonoCliente };
        }

        if (data.telefono && data.telefono !== telefonoCliente) return;
        mostrarTypingCliente(data.tipo);
      });

      await cargarHistorial();
      stompClient.send("/app/chat/online", {}, telefonoCliente);
    },
    (error) => {
      console.error("Error WS:", error);
      estadoChat("Reconectando...");

      const btn = document.getElementById("btn-enviar");
      if (btn) btn.disabled = true;

      reconnectTimer = setTimeout(conectarChat, 3000);
    }
  );
}

function generarIdTemporal() {
  if (window.crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function enviarMensaje() {
  if (!stompClient?.connected) {
    estadoChat("Chat conectándose. Intenta de nuevo en un segundo.");
    return;
  }

  const input = document.getElementById("chat-input");
  if (!input) return;

  const texto = input.value.trim();
  if (!texto) return;

  const mensaje = {
    id: generarIdTemporal(),
    nombre: authData.nombre,
    mensaje: texto,
    telefono: telefonoCliente,
    tipo: "CLIENTE",
    fecha: new Date().toISOString(),
  };

  agregarMensaje(mensaje);
  stompClient.send("/app/chat", {}, JSON.stringify(mensaje));

  input.value = "";
  input.style.height = "56px";
}

function mostrarTypingCliente(remitenteTipo) {
  if (remitenteTipo !== "ADMIN") return;

  const chatBox = document.getElementById("chat-mensajes");
  if (!chatBox) return;

  let typing = document.getElementById("typing-cliente");
  if (!typing) {
    typing = document.createElement("div");
    typing.id = "typing-cliente";
    typing.className = "msg-admin typing";
    typing.textContent = "Soporte escribiendo...";
    chatBox.appendChild(typing);
  }

  chatBox.scrollTop = chatBox.scrollHeight;
  clearTimeout(typing._timeout);
  typing._timeout = setTimeout(() => typing.remove(), 1600);
}

function renderizarPedidos(contenedor, pedidos) {
  contenedor.innerHTML = pedidos
    .map((pedido) => {
      const fecha = pedido.fecha
        ? new Date(pedido.fecha).toLocaleString("es-CO")
        : "—";

      const detallesHTML =
        pedido.detalles?.length
          ? pedido.detalles
              .map((d) => {
                const producto = escapeHtml(d.producto);
                const cantidad = Number(d.cantidad || 0);
                const subtotal = Number(d.precioUnitario || 0) * cantidad;
                const nota = d.notaPersonalizacion
                  ? `<br><small>Personalización: ${escapeHtml(
                      d.notaPersonalizacion
                    )}</small>`
                  : "";

                return `
                  <li>
                    <strong>${producto}</strong> x ${cantidad} — $${subtotal.toLocaleString("es-CO")}
                    ${nota}
                  </li>
                `;
              })
              .join("")
          : "<li>Sin productos</li>";

      return `
        <article class="pedido-card">
          <h3>Pedido #${Number(pedido.id || 0)}</h3>
          ${checklistEstado(textoSeguro(pedido.estado))}
          <p><strong>Fecha:</strong> ${escapeHtml(fecha)}</p>
          <p><strong>Estado:</strong> ${escapeHtml(pedido.estado)}</p>
          <p><strong>Pago:</strong> ${
            pedido.estadoPago === "PAGADO" ? "✅ Pagado" : "⏳ Pendiente"
          }</p>
          <p><strong>Método:</strong> ${escapeHtml(pedido.metodoPago || "No definido")}</p>
          <ul>${detallesHTML}</ul>
          <p><strong>Total:</strong> $${Number(pedido.total || 0).toLocaleString("es-CO")}</p>
        </article>
      `;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("pedidos");
  const token = authData.token;
  const nombre = authData?.nombre || "";

  const nombreUsuario = document.getElementById("nombreUsuario");
  if (nombreUsuario) {
    nombreUsuario.textContent = nombre ? `, ${nombre}` : "";
  }

  try {
    const res = await fetch(`${API_BASE}/api/pedidos/mis-pedidos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      sessionStorage.removeItem("auth");
      contenedor.innerHTML = `
        <div class="empty">
          <p>Tu sesión ha expirado.</p>
          <button class="btn btn-primario" onclick="irLogin()">Iniciar sesión nuevamente</button>
        </div>
      `;
      return;
    }

    if (!res.ok) {
      throw new Error("No se pudieron cargar los pedidos");
    }

    const pedidos = await res.json();

    if (!pedidos.length) {
      contenedor.innerHTML = `
        <div class="empty">
          <p>Aún no tienes pedidos. ¡Explora nuestros productos y crea el primero!</p>
          <button class="btn" onclick="volver()">Ir a la tienda</button>
        </div>
      `;
    } else {
      renderizarPedidos(contenedor, pedidos);
    }
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<div class="empty">⚠️ Error al cargar tus pedidos.</div>';
  }

  conectarChat();

  document.getElementById("chat-input")?.addEventListener("input", (event) => {
    const area = event.target;
    area.style.height = "56px";
    area.style.height = `${Math.min(area.scrollHeight, 140)}px`;

    if (stompClient?.connected && telefonoCliente) {
      stompClient.send(
        "/app/chat/typing",
        {},
        JSON.stringify({ telefono: telefonoCliente, tipo: "CLIENTE" })
      );
    }
  });

  document.getElementById("chat-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      enviarMensaje();
    }
  });
});

document.addEventListener("input", (e) => {
  if (e.target.id !== "buscarPedido") return;

  const texto = e.target.value.toLowerCase();
  document.querySelectorAll(".pedido-card").forEach((card) => {
    const titulo = card.querySelector("h3")?.textContent.toLowerCase() || "";
    card.style.display = titulo.includes(texto) ? "block" : "none";
  });
});
