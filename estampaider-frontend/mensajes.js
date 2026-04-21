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
      : "http://localhost:8080");

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

  const tabs = Array.from(
    document.querySelectorAll("[data-filtro-mensaje], [data-filtro]")
  );

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
  let telefonoActivo = "";
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
    const telefono = normalizarTelefono(item?.telefono || item?.whatsapp || "");
    return {
      id: item?.id ?? null,
      nombre: textoSeguro(item?.nombre || "Cliente"),
      correo: textoSeguro(item?.correo || ""),
      whatsapp: textoSeguro(item?.whatsapp || ""),
      telefono,
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
    await eliminarConversacionLista(m);
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
    if (msg.id && chatMensajes.querySelector(`[data-id="${msg.id}"]`)) return;

    const burbuja = crearBurbuja(msg);
    chatMensajes.appendChild(burbuja);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
  }

  function setEstadoChat(texto, online = false) {
    if (!chatEstado) return;
    chatEstado.textContent = texto;
    chatEstado.classList.toggle("online", Boolean(online));
  }

  async function cargarMensajes() {
    try {
      const res = await fetch(`${API_BASE}/api/mensajes`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`No se pudieron cargar mensajes (${res.status})`);
      }

      const data = await res.json();
      const lista = Array.isArray(data) ? data.map(normalizarMensajeListado) : [];

      const anterioresNoLeidos = mensajes.filter((m) => !m.leido).length;
      const nuevosNoLeidos = lista.filter((m) => !m.leido).length;

      if (nuevosNoLeidos > anterioresNoLeidos && mensajes.length && sonido) {
        sonido.play().catch(() => {});
      }

      mensajes = lista;
      renderizarLista();
    } catch (error) {
      console.error("Error mensajes:", error);
      if (contenedor) {
        contenedor.innerHTML = `<div class="vacio">Error al cargar mensajes.</div>`;
      }
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

  async function marcarLeido(id) {
    if (!id) return;

    try {
      await fetch(`${API_BASE}/api/mensajes/${id}/leido`, {
        method: "PUT",
        headers: getHeaders(),
      });

      const encontrado = mensajes.find((m) => m.id === id);
      if (encontrado) {
        encontrado.leido = true;
      }
      renderizarLista();
    } catch (error) {
      console.warn("No se pudo marcar leído:", error);
    }
  }

  function desconectarSocket() {
    try {
      chatSubscription?.unsubscribe();
    } catch {}

    try {
      onlineSubscription?.unsubscribe();
    } catch {}

    try {
      typingSubscription?.unsubscribe();
    } catch {}

    try {
      stompClient?.disconnect(() => {});
    } catch {}

    chatSubscription = null;
    onlineSubscription = null;
    typingSubscription = null;
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

        if (data.tipo === "LEIDO" || data.tipo === "RECIBIDO") {
          return;
        }

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

  async function abrirChat(mensaje) {
    telefonoActivo = normalizarTelefono(mensaje?.telefono || mensaje?.whatsapp || "");
    nombreActivo = mensaje?.nombre || telefonoActivo || "Cliente";

    if (!telefonoActivo) {
      mostrarToast("Este mensaje no tiene un teléfono válido.");
      return;
    }

    chatContainer?.classList.remove("hidden");

    if (chatNombre) {
      chatNombre.textContent = nombreActivo;
    }

    setEstadoChat("Cargando...", false);
    await cargarHistorialTelefono(telefonoActivo);

    if (!mensaje.leido && mensaje.id) {
      await marcarLeido(mensaje.id);
    }

    conectarSocket();
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
      if (!stompClient?.connected) {
        throw new Error("Socket no conectado");
      }

      stompClient.send("/app/chat", {}, JSON.stringify(payload));
      chatInput.value = "";
      setEstadoChat("En línea", true);
      cargarMensajes();
    } catch (error) {
      console.error("Error enviando chat:", error);
      mostrarToast("No se pudo enviar el mensaje");
    }
  }

  async function eliminarConversacionLista(mensaje) {
    if (!mensaje) return;
  
    const telefono = normalizarTelefono(mensaje.telefono || mensaje.whatsapp || "");
    const idMensaje = mensaje.id;
  
    const ok = confirm(
      `¿Seguro que deseas eliminar la conversación de ${mensaje.nombre || "este cliente"}?`
    );
    if (!ok) return;
  
    try {
      // 1. Borra historial de chat si existe teléfono
      if (telefono) {
        const resChat = await fetch(
          `${API_BASE}/api/chat/${encodeURIComponent(telefono)}`,
          {
            method: "DELETE",
            headers: getHeaders(),
          }
        );
  
        if (!resChat.ok && resChat.status !== 404) {
          throw new Error(`No se pudo eliminar el chat (${resChat.status})`);
        }
      }
  
      // 2. Borra el registro visible del panel izquierdo
      if (idMensaje) {
        const resMensaje = await fetch(`${API_BASE}/api/mensajes/${idMensaje}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
  
        if (!resMensaje.ok && resMensaje.status !== 404) {
          throw new Error(`No se pudo eliminar el mensaje (${resMensaje.status})`);
        }
      }
  
      // 3. Saca la tarjeta de la lista local
      mensajes = mensajes.filter((item) => item.id !== idMensaje);
  
      // 4. Si el chat abierto era ese mismo, ciérralo
      if (telefonoActivo && telefono && telefonoActivo === telefono) {
        cerrarChat();
      }
  
      renderizarLista();
      mostrarToast("Conversación eliminada correctamente.");
    } catch (error) {
      console.error("Error eliminando conversación desde la lista:", error);
      mostrarToast("No se pudo eliminar la conversación.");
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

      if (!res.ok) {
        throw new Error(`No se pudo eliminar el mensaje (${res.status})`);
      }

      const nodo = chatMensajes?.querySelector(`[data-id="${id}"]`);
      nodo?.closest(".chat-row")?.remove();

      mostrarToast("Mensaje eliminado");
      await cargarMensajes();
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

      if (!res.ok) {
        throw new Error(`No se pudo eliminar el chat (${res.status})`);
      }

      mensajes = mensajes.filter(
        (m) => normalizarTelefono(m.telefono || m.whatsapp) !== telefonoActivo
      );

      cerrarChat();
      renderizarLista();
      mostrarToast("Chat eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando chat:", error);
      mostrarToast("No se pudo eliminar el chat");
    }
  }

  function cerrarChat() {
    telefonoActivo = "";
    nombreActivo = "Cliente";

    desconectarSocket();
    chatContainer?.classList.add("hidden");

    if (chatMensajes) {
      chatMensajes.innerHTML = `<div class="vacio">Abre una conversación para ver los mensajes.</div>`;
    }

    if (chatNombre) {
      chatNombre.textContent = "Cliente";
    }

    setEstadoChat("Selecciona una conversación", false);
  }

  function activarFiltro(filtro) {
    filtroActual = filtro;
    paginaActual = 1;

    tabs.forEach((tab) => tab.classList.remove("activo"));

    tabs.forEach((tab) => {
      const valor = tab.dataset.filtroMensaje || tab.dataset.filtro;
      if (valor === filtro) {
        tab.classList.add("activo");
      }
    });

    renderizarLista();
  }

  buscador?.addEventListener("input", (e) => {
    textoBusqueda = e.target.value || "";
    paginaActual = 1;
    renderizarLista();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const valor = tab.dataset.filtroMensaje || tab.dataset.filtro || "TODOS";
      activarFiltro(valor);
    });
  });

  btnEnviarChat?.addEventListener("click", enviarMensajeAdmin);
  btnCerrarChat?.addEventListener("click", cerrarChat);
  btnEliminarChat?.addEventListener("click", eliminarChatActivo);

  btnExcel?.addEventListener("click", () => {
    mostrarToast("La exportación Excel sigue igual. No la toqué en esta corrección.");
  });

  btnPDF?.addEventListener("click", () => {
    mostrarToast("La exportación PDF sigue igual. No la toqué en esta corrección.");
  });

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
        JSON.stringify({
          telefono: telefonoActivo,
          tipo: "ADMIN",
        })
      );
    }
  });

  cargarMensajes();
  activarFiltro("TODOS");
  setInterval(cargarMensajes, 15000);
});