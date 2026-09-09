function obtenerAuth() {
  try {
    const sessionAuth = sessionStorage.getItem("auth");
    if (sessionAuth) return JSON.parse(sessionAuth);

    const localAuth = localStorage.getItem("auth");
    if (localAuth) return JSON.parse(localAuth);

    return null;
  } catch (e) {
    console.error("Error leyendo auth:", e);
    return null;
  }
}

const authData = obtenerAuth();

const API_BASE = resolverApiBase();

let stompClient = null;
let telefonoCliente = null;
let reconnectTimer = null;
let cerrarChatIntencionalmente = false;

function getAuthHeaders() {
  if (!authData?.token) return {};
  return {
    Authorization: `Bearer ${authData.token}`,
  };
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
  localStorage.removeItem("auth");
  window.location.href = "index.html";
}

function checklistEstado(estado) {
  const estados = [
    { key: "RECIBIDO", label: "Recibido", icono: "📥" },
    { key: "PENDIENTE", label: "En proceso", icono: "🛠️" },
    { key: "ENVIADO", label: "Enviado", icono: "🚚" },
    { key: "ENTREGADO", label: "Entregado", icono: "✅" },
  ];

  const actual = estados.findIndex((e) => e.key === estado);
  const progreso =
    actual < 0 ? 0 : (actual / (estados.length - 1)) * 100;

  return `
    <div class="pedido-progreso">
      <div class="pedido-progreso-barra">
        <div class="pedido-progreso-fill" style="width:${progreso}%"></div>
      </div>

      <div class="pedido-checklist">
        ${estados
          .map((e, index) => {
            const activo = index <= actual ? "activo" : "";
            const actualClase = index === actual ? "actual" : "";

            return `
              <div class="check-step ${activo} ${actualClase}">
                <div class="check-dot">${e.icono}</div>
                <div class="check-label">${e.label}</div>
              </div>
            `;
          })
          .join("")}
      </div>
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

function crearBurbujaMensaje(msg) {
  const div = document.createElement("div");
  if (msg.id) div.dataset.id = msg.id;
  div.className = msg.tipo === "CLIENTE" ? "msg-cliente" : "msg-admin";

  const contenido = document.createElement("div");
  contenido.textContent = textoSeguro(msg.mensaje);

  const meta = document.createElement("span");
  meta.className = "msg-meta";

  const hora = document.createElement("span");
  hora.textContent = formatearHora(msg.fecha);
  meta.appendChild(hora);

  if (msg.tipo === "CLIENTE") {
    const entrega = document.createElement("span");
    entrega.className = "msg-estado-entrega";
    entrega.textContent = msg.leido
      ? " • Leído"
      : msg.recibido
        ? " • Entregado"
        : " • Enviado";
    meta.appendChild(entrega);
  }

  div.append(contenido, meta);
  return div;
}

function actualizarEstadoEntrega(evento) {
  const ids = Array.isArray(evento?.mensajeIds)
    ? new Set(evento.mensajeIds.map(textoSeguro))
    : new Set();
  if (!ids.size) return;

  const texto = evento.tipo === "LEIDO"
    ? ` • Leído a las ${formatearHora(evento.fecha)}`
    : " • Entregado";

  document.querySelectorAll("#chat-mensajes .msg-cliente[data-id]").forEach((burbuja) => {
    if (!ids.has(textoSeguro(burbuja.dataset.id))) return;
    const estado = burbuja.querySelector(".msg-estado-entrega");
    if (estado) estado.textContent = texto;
  });
}

function enviarConfirmacion(tipo) {
  if (!stompClient?.connected || !telefonoCliente) return;
  stompClient.send(
    `/app/chat/${tipo}`,
    {},
    JSON.stringify({ telefono: telefonoCliente, tipo: "CLIENTE" })
  );
}

function confirmarSegunVisibilidad() {
  enviarConfirmacion(document.visibilityState === "visible" ? "leido" : "recibido");
}

function agregarMensaje(msg, confirmarLectura = true) {
  const chatBox = document.getElementById("chat-mensajes");
  if (!chatBox || !msg) return;
  if (msg.tipo === "RECIBIDO" || msg.tipo === "LEIDO") {
    actualizarEstadoEntrega(msg);
    return;
  }
  if (!msg.mensaje) return;
  if (msg.id && chatBox.querySelector(`[data-id="${msg.id}"]`)) return;

  quitarTypingCliente();

  const burbuja = crearBurbujaMensaje(msg);
  chatBox.appendChild(burbuja);
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth",
  });

  if (confirmarLectura && msg.tipo === "ADMIN") confirmarSegunVisibilidad();
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
    const res = await fetch(`${API_BASE}/api/chat/${telefonoCliente}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error(`No se pudo cargar el historial (${res.status})`);
    }

    const historial = await res.json();

    if (!historial.length) {
      agregarMensajeSistema(
        "Hola, soy el soporte de Estampaider. Cuéntanos en qué podemos ayudarte con tu pedido.",
        "Ahora"
      );
      return;
    }

    historial.forEach((mensaje) => agregarMensaje(mensaje, false));
  } catch (error) {
    console.error("Error cargando historial:", error);
    agregarMensajeSistema(
      "No pudimos cargar el historial del chat. Puedes escribirnos de todos modos.",
      "Aviso"
    );
  }
}

function renderizarLoginRequerido() {
  const contenedor = document.getElementById("pedidos");
  const chatSection = document.getElementById("chat-section");

  if (contenedor) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <p>Tu sesión no está activa.</p>
        <button class="btn-principal" onclick="irLogin()">Iniciar sesión</button>
      </div>
    `;
  }

  if (chatSection) {
    chatSection.innerHTML = `
      <div class="empty-state">
        <p>Para usar el chat debes iniciar sesión nuevamente.</p>
        <button class="btn-principal" onclick="irLogin()">Iniciar sesión</button>
      </div>
    `;
  }
}

function conectarChat() {
  if (!authData?.telefono) {
    renderizarLoginRequerido();
    return;
  }

  telefonoCliente = authData.telefono.toString().replace(/\D/g, "");
  if (!telefonoCliente.startsWith("57")) {
    telefonoCliente = `57${telefonoCliente}`;
  }

  estadoChat("Conectando...");
  cerrarChatIntencionalmente = false;

  const socket = new SockJS(`${API_BASE}/ws`);
  stompClient = Stomp.over(socket);
  stompClient.debug = () => {};

  stompClient.connect(
    {
      ...getAuthHeaders(),
      telefono: telefonoCliente,
      tipo: "CLIENTE",
    },
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
      confirmarSegunVisibilidad();
    },
    (error) => {
      console.error("Error WS:", error);
      if (cerrarChatIntencionalmente) return;
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
    nombre: authData?.nombre || "Cliente",
    correo: authData?.correo || "",
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

      const detallesHTML = pedido.detalles?.length
        ? pedido.detalles
        .map((d) => {
          const producto = escapeHtml(d.producto);
          const cantidad = Number(d.cantidad || 0);
          const subtotal = Number(d.precioUnitario || 0) * cantidad;
        
          const talla = d.talla
            ? `<div><strong>Talla:</strong> ${escapeHtml(d.talla)}</div>`
            : "";
        
          const color = d.color
            ? `<div><strong>Color:</strong> ${escapeHtml(d.color)}</div>`
            : "";
        
          return `
            <li>
              <strong>${producto}</strong> x ${cantidad}
              — $${subtotal.toLocaleString("es-CO")}
              ${talla}
              ${color}
            </li>
          `;
        })
            .join(" ")
        : "<li>Sin productos</li>";

        return `
        <article class="pedido-card">
          
          <div class="pedido-header">
            <h3>Pedido #${Number(pedido.id || 0)}</h3>
            <span class="pedido-estado ${pedido.estado}">
              ${escapeHtml(pedido.estado)}
            </span>
          </div>
      
          ${checklistEstado(textoSeguro(pedido.estado))}
      
          <div class="pedido-info">
            <div><strong>Fecha:</strong> ${escapeHtml(fecha)}</div>
            <div><strong>Pago:</strong> ${
              pedido.estadoPago === "PAGADO"
                ? '<span class="ok">✅ Pagado</span>'
                : '<span class="pendiente">⏳ Pendiente</span>'
            }</div>
            <div><strong>Método:</strong> ${escapeHtml(
              pedido.metodoPago || "No definido"
            )}</div>
          </div>
      
          <ul class="pedido-detalles">
            ${detallesHTML}
          </ul>
      
          <div class="pedido-total">
            Total: $${Number(pedido.total || 0).toLocaleString("es-CO")}
          </div>
      
        </article>
      `;
    })
    .join(" ");
}

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("pedidos");
  const token = authData?.token;
  const nombre = authData?.nombre || "";
  const nombreUsuario = document.getElementById("nombreUsuario");

  if (nombreUsuario) {
    nombreUsuario.textContent = nombre ? `, ${nombre}` : "";
  }

  if (!authData || !token) {
    renderizarLoginRequerido();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/pedidos/mis-pedidos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      sessionStorage.removeItem("auth");
      localStorage.removeItem("auth");
      renderizarLoginRequerido();
      return;
    }

    if (!res.ok) {
      throw new Error("No se pudieron cargar los pedidos");
    }

    const pedidos = await res.json();

    if (!pedidos.length) {
      contenedor.innerHTML = `
        <div class="empty-state">
          <p>Aún no tienes pedidos. ¡Explora nuestros productos y crea el primero!</p>
          <button class="btn-principal" onclick="volver()">Ir a la tienda</button>
        </div>
      `;
    } else {
      renderizarPedidos(contenedor, pedidos);
    }
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Error al cargar tus pedidos.</p>
      </div>
    `;
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
        JSON.stringify({
          telefono: telefonoCliente,
          tipo: "CLIENTE",
        })
      );
    }
  });

  document.getElementById("chat-input")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      enviarMensaje();
    }
  });

  document.getElementById("btn-enviar")?.addEventListener("click", enviarMensaje);
});

document.addEventListener("input", (e) => {
  if (e.target.id !== "buscarPedido") return;

  const texto = e.target.value.toLowerCase();

  document.querySelectorAll(".pedido-card").forEach((card) => {
    const titulo = card.querySelector("h3")?.textContent.toLowerCase() || "";
    card.style.display = titulo.includes(texto) ? "block" : "none";
  });
});

window.addEventListener("pagehide", () => {
  cerrarChatIntencionalmente = true;
  clearTimeout(reconnectTimer);
  try { stompClient?.disconnect(() => {}); } catch {}
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    enviarConfirmacion("leido");
  }
});
