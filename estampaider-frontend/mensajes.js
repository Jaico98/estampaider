document.addEventListener("DOMContentLoaded", () => {
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");
  if (!auth || !auth.token || auth.rol !== "ADMIN") {
    sessionStorage.setItem("redirectAfterLogin", "../mensajes.html");
    window.location.href = "admin/login.html";
    return;
  }

  const API_BASE =
    window.ESTAMPAIDER_CONFIG?.API_BASE ||
    (typeof resolverApiBase === "function" ? resolverApiBase() : "http://localhost:8080");

  const WS_BASE = `${API_BASE}/ws`;

  const contenedor = document.getElementById("mensajes");
  const badge = document.getElementById("badgeMensajes");
  const buscador = document.getElementById("buscadorMensajes");
  const paginacion = document.getElementById("paginacion");
  const chatContainer = document.getElementById("chat-container");
  const chatNombre = document.getElementById("chat-nombre");
  const chatEstado = document.getElementById("chat-estado");
  const chatMensajes = document.getElementById("chat-mensajes");
  const chatInput = document.getElementById("chat-input");
  const btnEnviarChat = document.getElementById("btnEnviarChat");
  const btnCerrarChat = document.getElementById("btnCerrarChat");
  const btnEliminarChat = document.getElementById("btnEliminarChat");
  const stats = document.getElementById("statsMensajes");
  const btnExcel = document.getElementById("excel");
  const btnPDF = document.getElementById("pdf");
  const sonido = new Audio("notification.mp3");

  let mensajes = [];
  let filtroActual = "TODOS";
  let textoBusqueda = "";
  let telefonoActivo = null;
  let nombreActivo = "Cliente";
  let paginaActual = 1;
  let stompClient = null;
  let chatSubscription = null;
  let onlineSubscription = null;
  let typingSubscription = null;
  const porPagina = 5;

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    };
  }

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  function normalizarTelefono(valor) {
    const limpio = textoSeguro(valor).replace(/\D/g, "");
    if (!limpio) return "";
    return limpio.startsWith("57") ? limpio : `57${limpio}`;
  }

  function formatearFecha(fecha) {
    if (!fecha) return "Sin fecha";
    return new Date(fecha).toLocaleString("es-CO");
  }

  function mostrarToast(mensaje) {
    if (typeof mostrarToastGlobal === "function") {
      mostrarToastGlobal(mensaje);
      return;
    }
    alert(mensaje);
  }

  function actualizarBadge() {
    const total = mensajes.filter((m) => !m.leido).length;
    if (badge) badge.textContent = total > 0 ? `(${total})` : "";
  }

  function renderizarEstadisticas() {
    if (!stats) return;
    const total = mensajes.length;
    const noLeidos = mensajes.filter((m) => !m.leido).length;
    const leidos = total - noLeidos;

    stats.innerHTML = `
      <article class="stat-card">
        <span class="stat-label">Total conversaciones</span>
        <strong>${total}</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">No leídos</span>
        <strong>${noLeidos}</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Leídos</span>
        <strong>${leidos}</strong>
      </article>
    `;
  }

  function construirTarjetaMensaje(m) {
    const item = document.createElement("article");
    item.className = `mensaje-card ${m.leido ? "leido" : "no-leido"}`;

    const top = document.createElement("div");
    top.className = "mensaje-top";

    const info = document.createElement("div");
    const titulo = document.createElement("h3");
    titulo.textContent = m.nombre || "Cliente";

    const meta = document.createElement("p");
    meta.textContent = `${textoSeguro(m.telefono)} • ${formatearFecha(m.fecha)}`;

    info.append(titulo, meta);

    const chip = document.createElement("span");
    chip.className = `mensaje-chip ${m.leido ? "chip-ok" : "chip-alerta"}`;
    chip.textContent = m.leido ? "Leído" : "Nuevo";

    top.append(info, chip);

    const preview = document.createElement("p");
    preview.textContent = textoSeguro(m.mensaje);

    const acciones = document.createElement("div");
    acciones.className = "mensaje-acciones";

    const abrir = document.createElement("button");
    abrir.type = "button";
    abrir.textContent = "Abrir chat";
    abrir.onclick = () => abrirChat(m);

    const eliminar = document.createElement("button");
    eliminar.type = "button";
    eliminar.className = "btn-peligro";
    eliminar.textContent = "Eliminar";
    eliminar.onclick = async (e) => {
      e.stopPropagation();
      await eliminarMensajeIndividual(m.id);
    };

    acciones.append(abrir, eliminar);
    item.append(top, preview, acciones);
    item.addEventListener("click", () => abrirChat(m));
    return item;
  }

  function mensajesFiltrados() {
    let lista = [...mensajes];

    if (filtroActual === "NO_LEIDOS") {
      lista = lista.filter((m) => !m.leido);
    } else if (filtroActual === "LEIDOS") {
      lista = lista.filter((m) => m.leido);
    }

    if (textoBusqueda.trim()) {
      const t = textoBusqueda.toLowerCase();
      lista = lista.filter(
        (m) =>
          textoSeguro(m.nombre).toLowerCase().includes(t) ||
          textoSeguro(m.mensaje).toLowerCase().includes(t) ||
          textoSeguro(m.telefono).toLowerCase().includes(t)
      );
    }

    lista.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    return lista;
  }

  function renderizarPaginacion(totalPaginas) {
    if (!paginacion) return;
    paginacion.innerHTML = "";

    if (totalPaginas <= 1) return;

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn-secundario";
    prev.textContent = "⬅ Anterior";
    prev.disabled = paginaActual === 1;
    prev.onclick = () => {
      if (paginaActual > 1) {
        paginaActual--;
        renderizarLista();
      }
    };

    const info = document.createElement("span");
    info.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn-secundario";
    next.textContent = "Siguiente ➡";
    next.disabled = paginaActual === totalPaginas;
    next.onclick = () => {
      if (paginaActual < totalPaginas) {
        paginaActual++;
        renderizarLista();
      }
    };

    paginacion.append(prev, info, next);
  }

  function renderizarLista() {
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const lista = mensajesFiltrados();

    if (!lista.length) {
      contenedor.innerHTML = `<div class="vacio">No hay mensajes.</div>`;
      paginacion.innerHTML = "";
      actualizarBadge();
      renderizarEstadisticas();
      return;
    }

    const totalPaginas = Math.ceil(lista.length / porPagina);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * porPagina;
    const pagina = lista.slice(inicio, inicio + porPagina);

    const fragment = document.createDocumentFragment();
    pagina.forEach((m) => fragment.appendChild(construirTarjetaMensaje(m)));
    contenedor.appendChild(fragment);

    renderizarPaginacion(totalPaginas);
    actualizarBadge();
    renderizarEstadisticas();
  }

  function crearBurbuja(msg) {
    const row = document.createElement("div");
    row.className = `chat-row ${msg.tipo === "ADMIN" ? "row-admin" : "row-cliente"}`;

    const div = document.createElement("div");
    div.className = msg.tipo === "ADMIN" ? "msg-admin" : "msg-cliente";
    if (msg.id) div.dataset.id = msg.id;

    const texto = document.createElement("div");
    texto.textContent = textoSeguro(msg.mensaje);

    const meta = document.createElement("span");
    meta.className = "msg-meta";
    meta.textContent = formatearFecha(msg.fecha);

    div.append(texto, meta);
    row.appendChild(div);
    return row;
  }

  function agregarMensajeChat(msg) {
    if (!chatMensajes || !msg) return;
    if (msg.id && chatMensajes.querySelector(`[data-id="${msg.id}"]`)) return;

    const burbuja = crearBurbuja(msg);
    chatMensajes.appendChild(burbuja);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
  }

  function setEstadoChat(texto, online = false) {
    if (!chatEstado) return;
    chatEstado.textContent = texto;
    chatEstado.classList.toggle("online", online);
  }

  async function cargarMensajes() {
    try {
      const res = await fetch(`${API_BASE}/api/mensajes`, { headers: getHeaders() });
      if (!res.ok) throw new Error("No se pudieron cargar mensajes");

      const data = await res.json();
      const anterioresNoLeidos = mensajes.filter((m) => !m.leido).length;
      const nuevosNoLeidos = data.filter((m) => !m.leido).length;

      if (nuevosNoLeidos > anterioresNoLeidos && mensajes.length) {
        sonido.play().catch(() => {});
      }

      mensajes = Array.isArray(data) ? data : [];
      renderizarLista();
    } catch (error) {
      console.error("Error mensajes:", error);
      contenedor.innerHTML = `<div class="vacio">Error al cargar mensajes.</div>`;
    }
  }

  async function cargarHistorialTelefono(telefono) {
    chatMensajes.innerHTML = `<div class="vacio">Cargando mensajes...</div>`;

    try {
      const res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(telefono)}`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error("No se pudo cargar el historial");
      }

      const historial = await res.json();
      chatMensajes.innerHTML = "";

      if (!Array.isArray(historial) || !historial.length) {
        chatMensajes.innerHTML = `<div class="vacio">No hay mensajes en este chat.</div>`;
        return;
      }

      historial.forEach(agregarMensajeChat);
    } catch (error) {
      console.error("Error historial chat:", error);
      chatMensajes.innerHTML = `<div class="vacio">No se pudo cargar el historial del chat.</div>`;
    }
  }

  async function marcarLeido(id) {
    if (!id) return;
    try {
      await fetch(`${API_BASE}/api/mensajes/${id}/leido`, {
        method: "PUT",
        headers: getHeaders(),
      });
    } catch (error) {
      console.warn("No se pudo marcar leído:", error);
    }
  }

  async function abrirChat(mensaje) {
    telefonoActivo = normalizarTelefono(mensaje.telefono);
    nombreActivo = mensaje.nombre || telefonoActivo || "Cliente";

    chatContainer?.classList.remove("hidden");
    if (chatNombre) chatNombre.textContent = nombreActivo;
    setEstadoChat("Cargando...", false);

    await cargarHistorialTelefono(telefonoActivo);

    if (!mensaje.leido && mensaje.id) {
      await marcarLeido(mensaje.id);
      const encontrado = mensajes.find((m) => m.id === mensaje.id);
      if (encontrado) encontrado.leido = true;
      renderizarLista();
    }

    conectarSocket();
  }

  function desconectarSocket() {
    try { chatSubscription?.unsubscribe(); } catch {}
    try { onlineSubscription?.unsubscribe(); } catch {}
    try { typingSubscription?.unsubscribe(); } catch {}
    try { stompClient?.disconnect(() => {}); } catch {}
    stompClient = null;
  }

  function conectarSocket() {
    if (!telefonoActivo) return;

    desconectarSocket();

    const socket = new SockJS(WS_BASE);
    stompClient = Stomp.over(socket);
    stompClient.debug = () => {};

    stompClient.connect({}, () => {
      setEstadoChat("En línea", true);

      chatSubscription = stompClient.subscribe(`/topic/chat/${telefonoActivo}`, (frame) => {
        const data = JSON.parse(frame.body);
        if (data.tipo === "LEIDO" || data.tipo === "RECIBIDO") return;
        agregarMensajeChat(data);
        cargarMensajes();
      });

      onlineSubscription = stompClient.subscribe(`/topic/online/${telefonoActivo}`, () => {
        setEstadoChat("En línea", true);
      });

      typingSubscription = stompClient.subscribe(`/topic/chat/${telefonoActivo}/typing`, (frame) => {
        let data;
        try {
          data = JSON.parse(frame.body);
        } catch {
          data = { tipo: frame.body };
        }

        if (data.tipo === "CLIENTE") {
          setEstadoChat("Escribiendo...", false);
          setTimeout(() => setEstadoChat("En línea", true), 1200);
        }
      });
    });
  }

  function generarIdTemporal() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function enviarMensajeAdmin() {
    if (!telefonoActivo || !chatInput) return;
    const texto = chatInput.value.trim();
    if (!texto) return;

    const payload = {
      id: generarIdTemporal(),
      nombre: auth.nombre || "Admin",
      telefono: telefonoActivo,
      mensaje: texto,
      tipo: "ADMIN",
      fecha: new Date().toISOString(),
    };

    agregarMensajeChat(payload);

    try {
      if (stompClient?.connected) {
        stompClient.send("/app/chat", {}, JSON.stringify(payload));
      } else {
        throw new Error("Socket no conectado");
      }

      chatInput.value = "";
      setEstadoChat("En línea", true);
      cargarMensajes();
    } catch (error) {
      console.error("Error enviando chat:", error);
      mostrarToast("No se pudo enviar el mensaje");
    }
  }

  async function eliminarMensajeIndividual(id) {
    if (!id) return;
    if (!confirm("¿Eliminar este mensaje?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/mensaje/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("No se pudo eliminar el mensaje");

      mensajes = mensajes.filter((m) => m.id !== id);
      renderizarLista();

      const nodo = chatMensajes.querySelector(`[data-id="${id}"]`);
      nodo?.closest(".chat-row")?.remove();

      mostrarToast("Mensaje eliminado");
    } catch (error) {
      console.error("Error eliminando mensaje:", error);
      mostrarToast("No se pudo eliminar el mensaje");
    }
  }

  async function eliminarChatActivo() {
    if (!telefonoActivo) return;
    if (!confirm(`¿Eliminar todo el chat de ${nombreActivo}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(telefonoActivo)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("No se pudo eliminar el chat");

      mensajes = mensajes.filter((m) => normalizarTelefono(m.telefono) !== telefonoActivo);
      cerrarChat();
      renderizarLista();
      mostrarToast("Chat eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando chat:", error);
      mostrarToast("No se pudo eliminar el chat");
    }
  }

  function cerrarChat() {
    telefonoActivo = null;
    nombreActivo = "Cliente";
    desconectarSocket();
    chatContainer?.classList.add("hidden");
    if (chatMensajes) {
      chatMensajes.innerHTML = `<div class="vacio">Abre una conversación para ver los mensajes.</div>`;
    }
    if (chatNombre) chatNombre.textContent = "Cliente";
    setEstadoChat("Selecciona una conversación", false);
    if (chatInput) chatInput.value = "";
  }

  function exportarExcel() {
    const lista = mensajesFiltrados();
    if (!lista.length) {
      mostrarToast("No hay mensajes para exportar");
      return;
    }

    const datos = lista.map((m) => ({
      ID: m.id || "",
      Nombre: m.nombre || "",
      Telefono: m.telefono || "",
      Mensaje: m.mensaje || "",
      Fecha: formatearFecha(m.fecha),
      Leido: m.leido ? "Sí" : "No"
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Mensajes");
    XLSX.writeFile(libro, "mensajes_estampaider.xlsx");
  }

  function exportarPDF() {
    const lista = mensajesFiltrados();
    if (!lista.length) {
      mostrarToast("No hay mensajes para exportar");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Mensajes Estampaider", 14, 15);

    const filas = lista.map((m) => [
      m.id || "",
      m.nombre || "",
      m.telefono || "",
      (m.mensaje || "").slice(0, 60),
      formatearFecha(m.fecha),
      m.leido ? "Sí" : "No"
    ]);

    doc.autoTable({
      head: [["ID", "Nombre", "Teléfono", "Mensaje", "Fecha", "Leído"]],
      body: filas,
      startY: 22,
      styles: { fontSize: 8 }
    });

    doc.save("mensajes_estampaider.pdf");
  }

  btnEnviarChat?.addEventListener("click", enviarMensajeAdmin);
  btnCerrarChat?.addEventListener("click", cerrarChat);
  btnEliminarChat?.addEventListener("click", eliminarChatActivo);
  btnExcel?.addEventListener("click", exportarExcel);
  btnPDF?.addEventListener("click", exportarPDF);

  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarMensajeAdmin();
      }
    });

    chatInput.addEventListener("input", () => {
      if (stompClient?.connected && telefonoActivo) {
        stompClient.send(
          "/app/chat/typing",
          {},
          JSON.stringify({ telefono: telefonoActivo, tipo: "ADMIN" })
        );
      }
    });
  }

  const filtros = document.querySelectorAll("[data-filtro-mensaje]");
  filtros.forEach((btn) => {
    btn.addEventListener("click", () => {
      filtros.forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      filtroActual = btn.dataset.filtroMensaje;
      paginaActual = 1;
      renderizarLista();
    });
  });

  buscador?.addEventListener("input", () => {
    textoBusqueda = buscador.value;
    paginaActual = 1;
    renderizarLista();
  });

  cargarMensajes();
  setInterval(cargarMensajes, 15000);

  window.cerrarChat = cerrarChat;
  window.enviarMensajeChat = enviarMensajeAdmin;
});