document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:8080";
  const WS_BASE = `${API_BASE}/ws`;
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");

  if (!auth || !auth.token || auth.rol !== "ADMIN") {
    sessionStorage.setItem("redirectAfterLogin", "../mensajes.html");
    window.location.href = "admin/login.html";
    return;
  }

  const contenedor = document.getElementById("mensajes");
  const badge = document.getElementById("badgeMensajes");
  const buscador = document.getElementById("buscadorMensajes");
  const paginacion = document.getElementById("paginacion");
  const chatContainer = document.getElementById("chat-container");
  const chatNombre = document.getElementById("chat-nombre");
  const chatEstado = document.getElementById("chat-estado");
  const chatMensajes = document.getElementById("chat-mensajes");
  const chatInput = document.getElementById("chat-input");
  const stats = document.getElementById("statsMensajes");
  const sonido = new Audio("notification.mp3");
  sonido.volume = 1;

  let mensajes = [];
  let filtroActual = "TODOS";
  let textoBusqueda = "";
  let telefonoActivo = null;
  let paginaActual = 1;
  let ultimaFecha = null;
  let stompClient = null;
  let chatSubscription = null;
  let onlineSubscription = null;
  let typingSubscription = null;
  let onlineTimeout = null;
  const porPagina = 5;

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    };
  }

  function normalizarTelefono(valor) {
    const limpio = (valor || "").toString().replace(/\D/g, "");
    if (!limpio) return "";
    return limpio.startsWith("57") ? limpio : `57${limpio}`;
  }

  function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";
    return new Date(fecha).toLocaleString("es-CO");
  }

  function actualizarBadge() {
    const total = mensajes.filter((m) => !m.leido).length;
    badge.textContent = total > 0 ? `(${total})` : "";
  }

  function renderizarEstadisticas() {
    const total = mensajes.length;
    const noLeidos = mensajes.filter((m) => !m.leido).length;
    const leidos = total - noLeidos;

    stats.innerHTML = `
      <div class="card stat-card"><span class="stat-label">Total</span><strong>${total}</strong></div>
      <div class="card stat-card"><span class="stat-label">No leídos</span><strong>${noLeidos}</strong></div>
      <div class="card stat-card"><span class="stat-label">Leídos</span><strong>${leidos}</strong></div>
    `;
  }

  function obtenerFiltrados() {
    let filtrados = [...mensajes];

    if (filtroActual === "NO_LEIDOS") {
      filtrados = filtrados.filter((m) => !m.leido);
    }
    if (filtroActual === "LEIDOS") {
      filtrados = filtrados.filter((m) => m.leido);
    }

    if (textoBusqueda.trim()) {
      const t = textoBusqueda.toLowerCase();
      filtrados = filtrados.filter((m) =>
        [m.nombre, m.correo, m.mensaje, m.whatsapp]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(t))
      );
    }

    return filtrados;
  }

  function renderizarPaginacion(total) {
    if (total <= 1) {
      paginacion.innerHTML = "";
      return;
    }

    paginacion.innerHTML = `
      <button type="button" id="prev" ${paginaActual === 1 ? "disabled" : ""}>⬅</button>
      <span>Página ${paginaActual} de ${total}</span>
      <button type="button" id="next" ${paginaActual === total ? "disabled" : ""}>➡</button>
    `;

    document.getElementById("prev")?.addEventListener("click", () => {
      if (paginaActual > 1) {
        paginaActual -= 1;
        renderizarMensajes();
      }
    });

    document.getElementById("next")?.addEventListener("click", () => {
      if (paginaActual < total) {
        paginaActual += 1;
        renderizarMensajes();
      }
    });
  }

  function renderizarMensajes() {
    const filtrados = obtenerFiltrados();
    contenedor.innerHTML = "";

    if (!filtrados.length) {
      contenedor.innerHTML = '<p class="vacio">No hay mensajes para mostrar.</p>';
      paginacion.innerHTML = "";
      return;
    }

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * porPagina;
    const pagina = filtrados.slice(inicio, inicio + porPagina);

    pagina.forEach((m) => {
      const card = document.createElement("article");
      card.className = `mensaje-card ${m.leido ? "" : "no-leido"}`;
      card.innerHTML = `
        <div class="mensaje-top">
          <div>
            <h3>${m.nombre || "Sin nombre"}</h3>
            <span class="mensaje-chip ${m.leido ? "chip-ok" : "chip-alerta"}">${m.leido ? "Leído" : "Nuevo"}</span>
          </div>
          <small>${formatearFecha(m.fecha)}</small>
        </div>
        <p><strong>Correo:</strong> ${m.correo || "No registrado"}</p>
        <p><strong>WhatsApp:</strong> ${m.whatsapp || "No proporcionado"}</p>
        <p><strong>Mensaje:</strong> ${m.mensaje || "Sin contenido"}</p>
        <div class="mensaje-acciones">
          <button type="button" class="btn-chat">Abrir chat</button>
          <button type="button" class="btn-pedidos" ${m.whatsapp ? "" : "disabled"}>Ver pedidos</button>
          <button type="button" class="btn-eliminar btn-secundario">Eliminar</button>
        </div>
      `;

      card.addEventListener("mouseenter", () => {
        if (!m.leido) {
          marcarComoLeido(m.id);
          m.leido = true;
          card.classList.remove("no-leido");
          actualizarBadge();
          renderizarEstadisticas();
        }
      });

      card.querySelector(".btn-chat").addEventListener("click", (e) => {
        e.stopPropagation();
        abrirChat(m);
      });

      card.querySelector(".btn-pedidos").addEventListener("click", (e) => {
        e.stopPropagation();
        const telefono = normalizarTelefono(m.whatsapp);
        if (!telefono) return;
        window.location.href = `pedidos.html?telefono=${telefono}`;
      });

      card.querySelector(".btn-eliminar").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar mensaje?")) return;
        await fetch(`${API_BASE}/api/mensajes/${m.id}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
        mensajes = mensajes.filter((item) => item.id !== m.id);
        renderizarMensajes();
        actualizarBadge();
        renderizarEstadisticas();
      });

      card.addEventListener("click", () => abrirChat(m));
      contenedor.appendChild(card);
    });

    renderizarPaginacion(totalPaginas);
  }

  async function cargarMensajes() {
    try {
      const response = await fetch(`${API_BASE}/api/mensajes`, { headers: getHeaders() });
      if (!response.ok) throw new Error("No se pudieron cargar los mensajes");
      const data = await response.json();
      mensajes = [...data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      renderizarMensajes();
      actualizarBadge();
      renderizarEstadisticas();
    } catch (error) {
      console.error(error);
      contenedor.innerHTML = '<p class="vacio">Error cargando mensajes.</p>';
    }
  }

  async function marcarComoLeido(id) {
    try {
      await fetch(`${API_BASE}/api/mensajes/${id}/leido`, {
        method: "PUT",
        headers: getHeaders(),
      });
    } catch (error) {
      console.error("No se pudo marcar como leído", error);
    }
  }

  function guardarMensajeLocal(msg) {
    if (!msg || !msg.telefono || !msg.mensaje) return;
    const key = `chat_${msg.telefono}`;
    const lista = JSON.parse(localStorage.getItem(key) || "[]");
    const existe = msg.id && lista.some((item) => item.id === msg.id);
    if (!existe) {
      lista.push(msg);
      localStorage.setItem(key, JSON.stringify(lista));
    }
  }

  function obtenerMensajesLocales(telefono) {
    return JSON.parse(localStorage.getItem(`chat_${telefono}`) || "[]");
  }

  function limpiarSuscripciones() {
    chatSubscription?.unsubscribe();
    onlineSubscription?.unsubscribe();
    typingSubscription?.unsubscribe();
    chatSubscription = null;
    onlineSubscription = null;
    typingSubscription = null;
    if (onlineTimeout) clearTimeout(onlineTimeout);
  }

  function actualizarChecks(tipo) {
    const checks = chatMensajes.querySelectorAll(".check");
    checks.forEach((check) => {
      if (tipo === "RECIBIDO") {
        check.textContent = "✔✔";
      }
      if (tipo === "LEIDO") {
        check.textContent = "✔✔";
        check.style.color = "#1d72f3";
      }
    });
  }

  function quitarTyping() {
    document.getElementById("typing")?.remove();
  }

  function agregarMensajeChat(msg) {
    if (!msg || !msg.mensaje) return;
    if (msg.id && chatMensajes.querySelector(`[data-id="${msg.id}"]`)) return;

    if (msg.tipo === "RECIBIDO" || msg.tipo === "LEIDO") {
      actualizarChecks(msg.tipo);
      return;
    }

    quitarTyping();

    const fecha = msg.fecha ? new Date(msg.fecha) : new Date();
    const fechaClave = fecha.toDateString();

    if (ultimaFecha !== fechaClave) {
      const sep = document.createElement("div");
      sep.className = "separador-fecha";
      sep.textContent = fecha.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      chatMensajes.appendChild(sep);
      ultimaFecha = fechaClave;
    }

    const div = document.createElement("div");
    if (msg.id) div.dataset.id = msg.id;
    div.className = `chat-row ${msg.tipo === "ADMIN" ? "row-admin" : "row-cliente"}`;
    div.innerHTML = `
      <div class="${msg.tipo === "ADMIN" ? "msg-admin" : "msg-cliente"}">
        <div>${msg.mensaje}</div>
        <span class="msg-meta">${fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} ${msg.tipo === "ADMIN" ? '<span class="check">✔</span>' : ""}</span>
      </div>
    `;

    chatMensajes.appendChild(div);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
    guardarMensajeLocal(msg);

    if (msg.tipo === "CLIENTE" && stompClient?.connected && telefonoActivo) {
      stompClient.send("/app/chat/recibido", {}, telefonoActivo);
    }
  }

  function mostrarTyping(remitenteTipo) {
    const contrario = remitenteTipo === "CLIENTE";
    if (!contrario) return;

    let typing = document.getElementById("typing");
    if (!typing) {
      typing = document.createElement("div");
      typing.id = "typing";
      typing.className = "chat-row row-cliente";
      typing.innerHTML = `
        <div class="msg-cliente typing">
          <span class="typing-dots"><i></i><i></i><i></i></span>
          Cliente escribiendo...
        </div>
      `;
      chatMensajes.appendChild(typing);
    }
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
    clearTimeout(typing._timeout);
    typing._timeout = setTimeout(() => typing.remove(), 1500);
  }

  function setClienteOnline(nombre) {
    chatNombre.textContent = nombre || "Cliente";
    chatEstado.textContent = "En línea";
    chatEstado.classList.add("online");
    if (onlineTimeout) clearTimeout(onlineTimeout);
    onlineTimeout = setTimeout(() => {
      chatEstado.textContent = "Conectado al chat";
      chatEstado.classList.remove("online");
    }, 3000);
  }

  async function abrirChat(mensajeContacto) {
    telefonoActivo = normalizarTelefono(mensajeContacto.whatsapp);
    if (!telefonoActivo) {
      alert("Este mensaje no tiene WhatsApp asociado.");
      return;
    }

    limpiarSuscripciones();
    ultimaFecha = null;
    chatContainer.classList.remove("hidden");
    chatNombre.textContent = mensajeContacto.nombre || "Cliente";
    chatEstado.textContent = mensajeContacto.whatsapp || "Conversación activa";
    chatMensajes.innerHTML = "";

    obtenerMensajesLocales(telefonoActivo).forEach(agregarMensajeChat);

    try {
      const response = await fetch(`${API_BASE}/api/chat/${telefonoActivo}`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error("No se pudo cargar el historial");
      const historial = await response.json();
      chatMensajes.innerHTML = "";
      ultimaFecha = null;
      historial.forEach(agregarMensajeChat);
    } catch (error) {
      console.error(error);
    }

    if (!stompClient?.connected) return;

    chatSubscription = stompClient.subscribe(`/topic/chat/${telefonoActivo}`, (frame) => {
      const data = JSON.parse(frame.body);
      agregarMensajeChat(data);
      if (data.tipo === "CLIENTE") {
        sonido.play().catch(() => {});
      }
    });

    onlineSubscription = stompClient.subscribe(`/topic/online/${telefonoActivo}`, () => {
      setClienteOnline(mensajeContacto.nombre || "Cliente");
    });

    typingSubscription = stompClient.subscribe(`/topic/chat/${telefonoActivo}/typing`, (frame) => {
      let data;
      try {
        data = JSON.parse(frame.body);
      } catch {
        data = { tipo: frame.body, telefono: telefonoActivo };
      }
      if (data.telefono && data.telefono !== telefonoActivo) return;
      mostrarTyping(data.tipo);
    });

    stompClient.send("/app/chat/leido", {}, telefonoActivo);
    stompClient.send("/app/chat/online", {}, telefonoActivo);
  }

  function conectarWebSocket() {
    const socket = new SockJS(WS_BASE);
    stompClient = Stomp.over(socket);
    stompClient.debug = () => {};

    stompClient.connect({}, () => {
      stompClient.subscribe("/topic/chat/global", (frame) => {
        const data = JSON.parse(frame.body);
        if (!data || !data.mensaje) return;

        const enChatAbierto = telefonoActivo && data.telefono === telefonoActivo;
        if (!enChatAbierto) {
          guardarMensajeLocal(data);
          if (data.tipo === "CLIENTE") {
            sonido.play().catch(() => {});
          }
        }
      });
    }, () => {
      setTimeout(conectarWebSocket, 3000);
    });
  }

  function enviarMensajeChat() {
    const texto = chatInput.value.trim();
    if (!texto || !telefonoActivo || !stompClient?.connected) return;

    const mensaje = {
      id: crypto.randomUUID(),
      nombre: auth.nombre || "ADMIN",
      mensaje: texto,
      telefono: telefonoActivo,
      tipo: "ADMIN",
      fecha: new Date().toISOString(),
    };

    agregarMensajeChat(mensaje);
    stompClient.send("/app/chat", {}, JSON.stringify(mensaje));
    chatInput.value = "";
  }

  function exportarExcel() {
    if (!window.XLSX) return;
    const ws = XLSX.utils.json_to_sheet(mensajes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mensajes");
    XLSX.writeFile(wb, "mensajes_estampaider.xlsx");
  }

  function exportarPDF() {
    if (!window.jspdf?.jsPDF) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const rows = mensajes.map((m) => [
      m.nombre || "",
      m.correo || "",
      m.whatsapp || "",
      m.leido ? "Leído" : "No leído",
      m.mensaje || "",
    ]);
    doc.text("Mensajes Estampaider", 10, 10);
    doc.autoTable({
      startY: 20,
      head: [["Nombre", "Correo", "WhatsApp", "Estado", "Mensaje"]],
      body: rows,
    });
    doc.save("mensajes_estampaider.pdf");
  }

  document.querySelectorAll("[data-filtro]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filtro]").forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      filtroActual = btn.dataset.filtro;
      paginaActual = 1;
      renderizarMensajes();
    });
  });

  buscador.addEventListener("input", () => {
    textoBusqueda = buscador.value;
    paginaActual = 1;
    renderizarMensajes();
  });

  chatInput.addEventListener("input", () => {
    if (stompClient?.connected && telefonoActivo) {
      stompClient.send("/app/chat/typing", {}, JSON.stringify({ telefono: telefonoActivo, tipo: "ADMIN" }));
    }
  });

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      enviarMensajeChat();
    }
  });

  document.getElementById("excel").addEventListener("click", exportarExcel);
  document.getElementById("pdf").addEventListener("click", exportarPDF);

  window.enviarMensajeChat = enviarMensajeChat;
  window.cerrarChat = function cerrarChat() {
    limpiarSuscripciones();
    telefonoActivo = null;
    quitarTyping();
    chatContainer.classList.add("hidden");
  };

  cargarMensajes();
  conectarWebSocket();
});
