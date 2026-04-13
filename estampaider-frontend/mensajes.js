document.addEventListener("DOMContentLoaded", () => {
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");
  if (!auth || !auth.token || auth.rol !== "ADMIN") {
    sessionStorage.setItem("redirectAfterLogin", "../mensajes.html");
    window.location.href = "admin/login.html";
    return;
  }

  const API_BASE =
    window.ESTAMPAIDER_CONFIG?.API_BASE ||
    (typeof resolverApiBase === "function"
      ? resolverApiBase()
      : "http://127.0.0.1:8080");

  const WS_BASE = `${API_BASE}/ws`;

  const contenedor = document.getElementById("mensajes");
  const badge = document.getElementById("badgeMensajes");
  const buscador =
    document.getElementById("buscarMensaje") ||
    document.getElementById("buscadorMensajes") ||
    document.querySelector('input[type="text"]');

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

  const tabs = Array.from(document.querySelectorAll("[data-filtro]"));
  const botonesTexto = Array.from(document.querySelectorAll("button")).filter((btn) => {
    const txt = (btn.textContent || "").trim().toLowerCase();
    return txt === "todos" || txt === "no leídos" || txt === "leídos" || txt === "no leidos";
  });

  const sonido = (() => {
    try {
      return new Audio("notification.mp3");
    } catch {
      return null;
    }
  })();

  let mensajes = [];
  let filtroActual = "TODOS";
  let textoBusqueda = "";
  let paginaActual = 1;
  let telefonoActivo = "";
  let nombreActivo = "Cliente";
  let stompClient = null;
  let chatSubscription = null;
  let typingSubscription = null;
  let onlineSubscription = null;
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
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleString("es-CO");
  }

  function mostrarToast(mensaje) {
    if (typeof mostrarToastGlobal === "function") {
      mostrarToastGlobal(mensaje);
      return;
    }
    alert(mensaje);
  }

  function normalizarMensajeListado(item) {
    return {
      id: item?.id ?? null,
      nombre: textoSeguro(item?.nombre || "Cliente"),
      correo: textoSeguro(item?.correo || ""),
      whatsapp: textoSeguro(item?.whatsapp || ""),
      telefono: normalizarTelefono(item?.telefono || item?.whatsapp || ""),
      mensaje: textoSeguro(item?.mensaje || ""),
      fecha: item?.fecha || null,
      leido: Boolean(item?.leido),
    };
  }

  function actualizarBadge() {
    const total = mensajes.filter((m) => !m.leido).length;
    if (badge) {
      badge.textContent = total > 0 ? `(${total})` : "";
    }
  }

  function renderizarEstadisticas() {
    if (!stats) return;

    const total = mensajes.length;
    const noLeidos = mensajes.filter((m) => !m.leido).length;
    const leidos = total - noLeidos;

    stats.innerHTML = `
      <div class="stat-item"><strong>${total}</strong> Total conversaciones</div>
      <div class="stat-item"><strong>${noLeidos}</strong> No leídos</div>
      <div class="stat-item"><strong>${leidos}</strong> Leídos</div>
    `;
  }

  function mensajesFiltrados() {
    let lista = [...mensajes];

    if (filtroActual === "NO_LEIDOS") {
      lista = lista.filter((m) => !m.leido);
    } else if (filtroActual === "LEIDOS") {
      lista = lista.filter((m) => m.leido);
    }

    if (textoBusqueda.trim()) {
      const t = textoBusqueda.trim().toLowerCase();
      lista = lista.filter((m) => {
        return (
          textoSeguro(m.nombre).toLowerCase().includes(t) ||
          textoSeguro(m.mensaje).toLowerCase().includes(t) ||
          textoSeguro(m.telefono).toLowerCase().includes(t) ||
          textoSeguro(m.whatsapp).toLowerCase().includes(t) ||
          textoSeguro(m.correo).toLowerCase().includes(t)
        );
      });
    }

    lista.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    return lista;
  }

  function setEstadoChat(texto, online = false) {
    if (!chatEstado) return;
    chatEstado.textContent = texto;
    chatEstado.classList.toggle("online", Boolean(online));
  }

  function crearBurbuja(msg) {
    const row = document.createElement("div");
    row.className = `chat-row ${msg.tipo === "ADMIN" ? "row-admin" : "row-cliente"}`;

    const div = document.createElement("div");
    div.className = msg.tipo === "ADMIN" ? "msg-admin" : "msg-cliente";

    if (msg.id) {
      div.dataset.id = msg.id;
    }

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

    if (msg.id && chatMensajes.querySelector(`[data-id="${msg.id}"]`)) {
      return;
    }

    const burbuja = crearBurbuja(msg);
    chatMensajes.appendChild(burbuja);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
  }

  function renderizarPaginacion(totalPaginas) {
    if (!paginacion) return;
    paginacion.innerHTML = "";

    if (totalPaginas <= 1) return;

    const prev = document.createElement("button");
    prev.type = "button";
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

  function construirTarjetaMensaje(m) {
    const item = document.createElement("article");
    item.className = `mensaje-card ${m.leido ? "leido" : "no-leido"}`;

    const top = document.createElement("div");
    top.className = "mensaje-top";

    const info = document.createElement("div");

    const titulo = document.createElement("h3");
    titulo.textContent = m.nombre || "Cliente";

    const meta = document.createElement("p");
    meta.textContent = `${textoSeguro(m.telefono || m.whatsapp)} • ${formatearFecha(m.fecha)}`;

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
    abrir.onclick = (e) => {
      e.stopPropagation();
      abrirChat(m);
    };

    const eliminar = document.createElement("button");
    eliminar.type = "button";
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

  function renderizarLista() {
    if (!contenedor) return;
    contenedor.innerHTML = "";

    const lista = mensajesFiltrados();

    if (!lista.length) {
      contenedor.innerHTML = `<div class="vacio">No hay mensajes.</div>`;
      if (paginacion) paginacion.innerHTML = "";
      actualizarBadge();
      renderizarEstadisticas();
      return;
    }

    const totalPaginas = Math.ceil(lista.length / porPagina);
    if (paginaActual > totalPaginas) {
      paginaActual = totalPaginas;
    }

    const inicio = (paginaActual - 1) * porPagina;
    const pagina = lista.slice(inicio, inicio + porPagina);

    const fragment = document.createDocumentFragment();
    pagina.forEach((m) => fragment.appendChild(construirTarjetaMensaje(m)));

    contenedor.appendChild(fragment);
    renderizarPaginacion(totalPaginas);
    actualizarBadge();
    renderizarEstadisticas();
  }

  async function cargarMensajes() {
    try {
      const res = await fetch(`${API_BASE}/api/mensajes`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar mensajes");
      }

      const data = await res.json();
      mensajes = Array.isArray(data) ? data.map(normalizarMensajeListado) : [];
      renderizarLista();
    } catch (error) {
      console.error("Error mensajes:", error);
      if (contenedor) {
        contenedor.innerHTML = `<div class="vacio">Error al cargar mensajes.</div>`;
      }
    }
  }

  async function marcarLeido(id) {
    if (!id) return;

    try {
      await fetch(`${API_BASE}/api/mensajes/${id}/leido`, {
        method: "PUT",
        headers: getHeaders(),
      });

      mensajes = mensajes.map((m) =>
        m.id === id ? { ...m, leido: true } : m
      );
      renderizarLista();
    } catch (error) {
      console.error("Error marcando leído:", error);
    }
  }

  async function cargarHistorialTelefono(telefono) {
    if (!chatMensajes) return;

    chatMensajes.innerHTML = `<div class="vacio">Cargando mensajes...</div>`;

    try {
      const res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(telefono)}`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`No se pudo cargar el historial (${res.status})`);
      }

      const historial = await res.json();
      chatMensajes.innerHTML = "";

      if (!Array.isArray(historial) || !historial.length) {
        chatMensajes.innerHTML = `<div class="vacio">No hay mensajes en este chat.</div>`;
        return;
      }

      historial.forEach(agregarMensajeChat);
      chatMensajes.scrollTop = chatMensajes.scrollHeight;
    } catch (error) {
      console.error("Error historial chat:", error);
      chatMensajes.innerHTML = `<div class="vacio">No se pudo cargar el historial del chat.</div>`;
    }
  }

  function limpiarSuscripcionesChat() {
    chatSubscription?.unsubscribe?.();
    typingSubscription?.unsubscribe?.();
    onlineSubscription?.unsubscribe?.();
    chatSubscription = null;
    typingSubscription = null;
    onlineSubscription = null;
  }

  function conectarSocket() {
    if (stompClient?.connected) return;

    const socket = new SockJS(WS_BASE);
    stompClient = Stomp.over(socket);
    stompClient.debug = () => {};

    stompClient.connect({}, () => {
      stompClient.subscribe("/topic/mensajes", (frame) => {
        try {
          const data = normalizarMensajeListado(JSON.parse(frame.body));
          const idx = mensajes.findIndex((m) => m.id === data.id);

          if (idx >= 0) {
            mensajes[idx] = data;
          } else {
            mensajes.unshift(data);
            sonido?.play?.().catch(() => {});
          }

          renderizarLista();
        } catch (error) {
          console.error("Error inbox WS:", error);
        }
      });

      stompClient.subscribe("/topic/chat/global", (frame) => {
        try {
          const data = JSON.parse(frame.body);
          const telefono = normalizarTelefono(data?.telefono);

          if (!telefono) return;

          if (telefonoActivo && telefono === telefonoActivo) {
            agregarMensajeChat(data);
          }

          const idx = mensajes.findIndex((m) => m.telefono === telefono);
          if (idx >= 0) {
            mensajes[idx] = {
              ...mensajes[idx],
              mensaje: data?.mensaje || mensajes[idx].mensaje,
              fecha: data?.fecha || mensajes[idx].fecha,
            };
          }

          renderizarLista();
        } catch (error) {
          console.error("Error chat global WS:", error);
        }
      });
    });
  }

  function suscribirChatActivo(telefono) {
    if (!stompClient?.connected || !telefono) return;

    limpiarSuscripcionesChat();

    chatSubscription = stompClient.subscribe(`/topic/chat/${telefono}`, (frame) => {
      try {
        const data = JSON.parse(frame.body);
        if (data?.tipo === "LEIDO" || data?.tipo === "RECIBIDO") return;
        agregarMensajeChat(data);
      } catch (error) {
        console.error("Error suscripción chat:", error);
      }
    });

    typingSubscription = stompClient.subscribe(`/topic/chat/${telefono}/typing`, (frame) => {
      try {
        const data = JSON.parse(frame.body);
        if (data.tipo === "CLIENTE") {
          setEstadoChat("Cliente escribiendo...", true);
          clearTimeout(window.__typingAdminTimer);
          window.__typingAdminTimer = setTimeout(() => {
            setEstadoChat("Chat activo", true);
          }, 1600);
        }
      } catch (error) {
        console.error("Error typing:", error);
      }
    });

    onlineSubscription = stompClient.subscribe(`/topic/online/${telefono}`, () => {
      setEstadoChat("Cliente en línea", true);
      clearTimeout(window.__onlineAdminTimer);
      window.__onlineAdminTimer = setTimeout(() => {
        setEstadoChat("Chat activo", true);
      }, 3000);
    });
  }

  async function abrirChat(mensaje) {
    const telefono = normalizarTelefono(mensaje?.telefono || mensaje?.whatsapp);

    if (!telefono) {
      mostrarToast("Este mensaje no tiene un teléfono válido.");
      return;
    }

    telefonoActivo = telefono;
    nombreActivo = textoSeguro(mensaje?.nombre || "Cliente");

    if (chatContainer) chatContainer.style.display = "";
    if (chatNombre) chatNombre.textContent = nombreActivo;
    if (chatInput) chatInput.value = "";
    if (chatMensajes) chatMensajes.innerHTML = "";

    setEstadoChat("Cargando historial...", false);
    await cargarHistorialTelefono(telefono);

    if (!mensaje.leido && mensaje.id) {
      await marcarLeido(mensaje.id);
    }

    setEstadoChat("Chat activo", true);
    suscribirChatActivo(telefono);
  }

  function cerrarChat() {
    telefonoActivo = "";
    nombreActivo = "Cliente";
    limpiarSuscripcionesChat();

    if (chatNombre) chatNombre.textContent = "Cliente";
    if (chatMensajes) {
      chatMensajes.innerHTML = `<div class="vacio">Selecciona una conversación.</div>`;
    }
    if (chatInput) chatInput.value = "";
    setEstadoChat("Selecciona una conversación", false);
  }

  async function enviarMensajeAdmin() {
    if (!telefonoActivo) {
      mostrarToast("Primero abre un chat.");
      return;
    }

    if (!stompClient?.connected) {
      mostrarToast("El chat aún se está conectando.");
      return;
    }

    const texto = textoSeguro(chatInput?.value).trim();
    if (!texto) return;

    const mensaje = {
      id:
        window.crypto?.randomUUID?.() ||
        `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nombre: "Admin Estampaider",
      mensaje: texto,
      telefono: telefonoActivo,
      tipo: "ADMIN",
      fecha: new Date().toISOString(),
    };

    agregarMensajeChat(mensaje);
    stompClient.send("/app/chat", {}, JSON.stringify(mensaje));

    if (chatInput) {
      chatInput.value = "";
      chatInput.focus();
    }
  }

  async function eliminarChatActivo() {
    if (!telefonoActivo) {
      mostrarToast("No hay un chat abierto.");
      return;
    }

    const ok = confirm(`¿Seguro que deseas eliminar el chat de ${nombreActivo}?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/chat/${encodeURIComponent(telefonoActivo)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar el chat");
      }

      mensajes = mensajes.filter((m) => m.telefono !== telefonoActivo);
      cerrarChat();
      renderizarLista();
      mostrarToast("Chat eliminado correctamente.");
    } catch (error) {
      console.error("Error eliminando chat:", error);
      mostrarToast("No se pudo eliminar el chat.");
    }
  }

  async function eliminarMensajeIndividual(id) {
    if (!id) return;

    const ok = confirm("¿Seguro que deseas eliminar este mensaje?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/mensajes/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar el mensaje");
      }

      mensajes = mensajes.filter((m) => m.id !== id);
      renderizarLista();
      mostrarToast("Mensaje eliminado.");
    } catch (error) {
      console.error("Error eliminando mensaje:", error);
      mostrarToast("No se pudo eliminar el mensaje.");
    }
  }

  function exportarExcel() {
    const lista = mensajesFiltrados();
    if (!lista.length) {
      mostrarToast("No hay mensajes para exportar");
      return;
    }

    if (!window.XLSX) {
      mostrarToast("La librería XLSX no está disponible.");
      return;
    }

    const datos = lista.map((m) => ({
      ID: m.id || "",
      Nombre: m.nombre || "",
      Telefono: m.telefono || "",
      Correo: m.correo || "",
      Mensaje: m.mensaje || "",
      Fecha: formatearFecha(m.fecha),
      Leido: m.leido ? "Sí" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mensajes");
    XLSX.writeFile(wb, "mensajes_estampaider.xlsx");
  }

  function exportarPDF() {
    const lista = mensajesFiltrados();
    if (!lista.length) {
      mostrarToast("No hay mensajes para exportar");
      return;
    }

    const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFLib) {
      mostrarToast("La librería PDF no está disponible.");
      return;
    }

    const doc = new jsPDFLib();
    doc.setFontSize(14);
    doc.text("Mensajes Estampaider", 14, 15);

    const filas = lista.map((m) => [
      m.id || "",
      m.nombre || "",
      m.telefono || "",
      (m.mensaje || "").slice(0, 60),
      formatearFecha(m.fecha),
      m.leido ? "Sí" : "No",
    ]);

    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        head: [["ID", "Nombre", "Teléfono", "Mensaje", "Fecha", "Leído"]],
        body: filas,
        startY: 22,
        styles: { fontSize: 8 },
      });
    }

    doc.save("mensajes_estampaider.pdf");
  }

  function activarFiltro(filtro) {
    filtroActual = filtro;
    paginaActual = 1;
    renderizarLista();

    tabs.forEach((t) => t.classList.remove("activo"));
    botonesTexto.forEach((b) => b.classList.remove("activo"));

    const tabData = tabs.find((t) => t.dataset.filtro === filtro);
    if (tabData) tabData.classList.add("activo");

    botonesTexto.forEach((btn) => {
      const txt = (btn.textContent || "").trim().toLowerCase();
      if (
        (filtro === "TODOS" && txt === "todos") ||
        (filtro === "NO_LEIDOS" && (txt === "no leídos" || txt === "no leidos")) ||
        (filtro === "LEIDOS" && txt === "leídos")
      ) {
        btn.classList.add("activo");
      }
    });
  }

  buscador?.addEventListener("input", (e) => {
    textoBusqueda = e.target.value || "";
    paginaActual = 1;
    renderizarLista();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activarFiltro(tab.dataset.filtro || "TODOS");
    });
  });

  botonesTexto.forEach((btn) => {
    btn.addEventListener("click", () => {
      const txt = (btn.textContent || "").trim().toLowerCase();

      if (txt === "todos") activarFiltro("TODOS");
      if (txt === "no leídos" || txt === "no leidos") activarFiltro("NO_LEIDOS");
      if (txt === "leídos") activarFiltro("LEIDOS");
    });
  });

  btnEnviarChat?.addEventListener("click", enviarMensajeAdmin);
  btnCerrarChat?.addEventListener("click", cerrarChat);
  btnEliminarChat?.addEventListener("click", eliminarChatActivo);
  btnExcel?.addEventListener("click", exportarExcel);
  btnPDF?.addEventListener("click", exportarPDF);

  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      enviarMensajeAdmin();
      return;
    }

    if (stompClient?.connected && telefonoActivo) {
      stompClient.send(
        "/app/chat/typing",
        {},
        JSON.stringify({ telefono: telefonoActivo, tipo: "ADMIN" })
      );
    }
  });

  conectarSocket();
  cargarMensajes();
  activarFiltro("TODOS");
  setInterval(cargarMensajes, 15000);
});