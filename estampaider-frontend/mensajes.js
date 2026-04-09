document.addEventListener("DOMContentLoaded", () => {

    const contenedor = document.getElementById("mensajes");
    let mensajes = [];
    let filtroActual = "TODOS";
    let textoBusqueda = "";
    let telefonoActivo = null;
    let paginaActual = 1;
    const porPagina = 5;
    let chatSubscription = null;
    let onlineSubscription = null;
    let ultimaFecha = null;
    let ultimoConteoNoLeidos = 0;
    let typingSubscription = null;
    const sonido = new Audio("notification.mp3");
    sonido.volume = 1;

    /* =========================
       HEADERS ADMIN
    ========================== */
    function getHeaders() {
        const auth = JSON.parse(sessionStorage.getItem("auth"));
    
        if (!auth || !auth.token) {
            alert("Sesión expirada");
            window.location.href = "admin/login.html";
            return {};
        }
    
        return {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + auth.token
        };
    }

    /* =========================
       CARGAR MENSAJES
    ========================== */
    function cargarMensajes() {
        fetch("http://localhost:8080/api/mensajes", { headers: getHeaders() })
                .then(res => {
                if (!res.ok) throw new Error("Error cargando mensajes");
                return res.json();
            })
            .then(data => {
                const dataOrdenada = [...data].reverse();
                if (JSON.stringify(dataOrdenada) === JSON.stringify(mensajes)) return;
                mensajes = dataOrdenada;
                paginaActual = 1;
                renderizarMensajes();
                actualizarBadge();
                actualizarBadgeDesdeBackend();
                renderizarEstadisticas();
            })
            .catch(() => {
                contenedor.innerHTML = "<p>Error cargando mensajes.</p>";
            });
    }

    function actualizarBadgeDesdeBackend() {
        fetch("http://localhost:8080/api/mensajes/no-leidos/count", {
            headers: getHeaders()
        })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(count => {
            const badge = document.getElementById("badgeMensajes");
    
            if (badge) {
                badge.textContent = count > 0 ? `(${count})` : "";
            }
        })
        .catch(() => {});
    }

    function pedirPermisoNotificaciones() {

        if (!("Notification" in window)) return;
    
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    /* =========================
       RENDER MENSAJES
    ========================== */
    function renderizarMensajes() {
        contenedor.innerHTML = "";

        let filtrados = [...mensajes];

        // Filtro leído
        if (filtroActual === "NO_LEIDOS") {
            filtrados = filtrados.filter(m => !m.leido);
        }
        if (filtroActual === "LEIDOS") {
            filtrados = filtrados.filter(m => m.leido);
        }

        // 🔍 Búsqueda
        if (textoBusqueda.trim()) {
            const t = textoBusqueda.toLowerCase();
            filtrados = filtrados.filter(m =>
                m.nombre?.toLowerCase().includes(t) ||
                m.correo?.toLowerCase().includes(t) ||
                m.mensaje?.toLowerCase().includes(t)
            );
        }

        if (!filtrados.length) {
            contenedor.innerHTML = "<p>No hay mensajes.</p>";
            return;
        }

        // 📄 Paginación
        const totalPaginas = Math.ceil(filtrados.length / porPagina);
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * porPagina;
        const pagina = filtrados.slice(inicio, inicio + porPagina);

        pagina.forEach(m => {
            const div = document.createElement("div");
            div.className = `pedido-card ${!m.leido ? "no-leido" : ""}`;

            div.innerHTML = `
                <h3>📨 ${m.nombre}</h3>
                <p><strong>Correo:</strong> ${m.correo}</p>
                <p><strong>Mensaje:</strong> ${m.mensaje}</p>
                <p><strong>WhatsApp:</strong> ${m.whatsapp || "No proporcionado"}</p>
                <p style="font-size:12px;color:#666;">
                    ${new Date(m.fecha).toLocaleString()}
                </p>

                <textarea class="respuesta" placeholder="✍️ Responder por WhatsApp..."></textarea>

                <div class="acciones">
                    <button class="whatsapp">📲 WhatsApp</button>
                    ${m.whatsapp ? `<button class="ver-pedidos">📦 Ver pedidos</button>` : ""}
                    <button class="eliminar">🗑 Eliminar</button>
                </div>
            `;

            // 👀 Marcar como leído
            div.addEventListener("mouseenter", () => {
                if (!m.leido) {
                    marcarComoLeido(m.id);
                    m.leido = true;
                    div.classList.remove("no-leido");
                    actualizarBadge();
                    renderizarEstadisticas();
                }
            });

            // 📲 WhatsApp
            div.querySelector(".whatsapp").onclick = () => {
                if (!m.whatsapp) return alert("Sin WhatsApp");

                const texto = div.querySelector(".respuesta").value.trim();
                const tel = m.whatsapp.replace(/\D/g, "");
                const msg = texto || `Hola ${m.nombre} 👋 Te escribe Estampaider.`;

                window.open(
                    `https://wa.me/57${tel}?text=${encodeURIComponent(msg)}`,
                    "_blank"
                );
            };

            // 📦 Ver pedidos del cliente
            const btnPedidos = div.querySelector(".ver-pedidos");
            if (btnPedidos) {
                btnPedidos.onclick = () => {
                    const tel = "57" + m.whatsapp.replace(/\D/g, "");
                    window.location.href = `pedidos.html?telefono=${tel}`;
                };
            }
            div.addEventListener("click", (e) => {
                if (e.target.tagName === "BUTTON") return;
                abrirChat(m);
            });

            // 🗑 Eliminar
            div.querySelector(".eliminar").onclick = () => {
                if (!confirm("¿Eliminar mensaje?")) return;

                fetch(`http://localhost:8080/api/mensajes/${m.id}`, {
                    method: "DELETE",
                    headers: getHeaders()
                }).then(() => {
                    mensajes = mensajes.filter(x => x.id !== m.id);
                    renderizarMensajes();
                    actualizarBadge();
                    renderizarEstadisticas();
                });
            };

            contenedor.appendChild(div);
        });

        renderizarPaginacion(totalPaginas);
    }
    let stompClient = null;

    function abrirChat(m) {

        ultimaFecha = null;
    
        let tel = m.whatsapp.replace(/\D/g, "");

        if (!tel.startsWith("57")) {
         tel = "57" + tel;
        }

          telefonoActivo = tel;

        console.log("📱 Admin usando teléfono:", telefonoActivo);
    
        document.getElementById("chat-container").classList.remove("hidden");
        document.getElementById("chat-nombre").textContent = m.nombre;
    
        const chatBox = document.getElementById("chat-mensajes");
        chatBox.innerHTML = "";

        const cache = JSON.parse(localStorage.getItem("chats")) || {};

        if (cache[telefonoActivo]) {
         cache[telefonoActivo].forEach(m => 
            agregarMensajeChat(m));
        }

        // 🔥 HISTORIAL
        fetch(`http://localhost:8080/api/chat/${telefonoActivo}`, {
            headers: getHeaders()
        })
        .then(res => {
            if (!res.ok) throw new Error("No autorizado");
            return res.json();
        })
        .then(data => {
            data.forEach(msg => agregarMensajeChat(msg));
        })
        .catch(err => {
            console.error("Error cargando chat:", err);
        });
    
        // 🔁 LIMPIAR SUSCRIPCIONES
        if (chatSubscription) chatSubscription.unsubscribe();
        if (onlineSubscription) onlineSubscription.unsubscribe();
        if (typingSubscription) typingSubscription.unsubscribe();
    
        if (!stompClient || !stompClient.connected) {
            console.warn("WebSocket no conectado");
            return;
        }
    
        // 💬 MENSAJES
        chatSubscription = stompClient.subscribe(
            "/topic/chat/" + telefonoActivo,
            (msg) => {
    
                let data;
    
                try {
                    data = JSON.parse(msg.body);
                } catch (e) {
                    return;
                }
    
                console.log("📩 Mensaje recibido:", data);
    
                // 🚫 ignorar basura
                if (!data || !data.mensaje) return;
                
                // 📌 ACTUALIZAR ESTADO
               if (data.tipo === "RECIBIDO" || data.tipo === "LEIDO") {
                actualizarEstadoMensaje(data);
              return;
            }
    
                agregarMensajeChat(data);
                guardarMensajeLocal(data);
    
                // 🔊 SONIDO SI ES DEL CLIENTE
                if (data.tipo === "CLIENTE") {
                    sonido.play().catch(() => {});
                    mostrarNotificacionFlotante(data);
                }
            }
        );
    
        // 🟢 ONLINE
        onlineSubscription = stompClient.subscribe(
            "/topic/online/" + telefonoActivo,
            () => {
                document.getElementById("chat-nombre").innerHTML =
                    `${m.nombre} <span style="color:#25D366;">● en línea</span>`;
            }
        );
    
        // ✍️ TYPING
        typingSubscription = stompClient.subscribe(
            "/topic/chat/" + telefonoActivo + "/typing",
            (msg) => {
                if (msg.body === "CLIENTE") mostrarTyping();
            }
        );
    
        // ✅ ESTADOS
        stompClient.send("/app/chat/leido", {}, telefonoActivo);
        stompClient.send("/app/chat/online", {}, telefonoActivo);
    }

    function enviarMensajeChat() {

        const input = document.getElementById("chat-input");
        const texto = input.value.trim();
    
        if (!texto || !telefonoActivo) return;
    
        if (!stompClient || !stompClient.connected) {
            alert("⚠️ Chat no conectado");
            return;
        }
    
        const mensaje = {
            id: crypto.randomUUID(),
            nombre: "ADMIN", 
            mensaje: texto,
            telefono: telefonoActivo,
            tipo: "ADMIN",
            estado: "ENVIADO",
        };
    
        // 🔥 MOSTRAR INMEDIATO (CLAVE)
        agregarMensajeChat(mensaje);
        guardarMensajeLocal(mensaje);
    
        // 🚀 Enviar al backend
        stompClient.send("/app/chat", {}, JSON.stringify(mensaje));
    
        input.value = "";
    }
   
    function agregarMensajeChat(msg) {

        const chatBox = document.getElementById("chat-mensajes");
    
        // 🚫 evitar duplicados REAL
        if (msg.id && chatBox.querySelector(`[data-id="${msg.id}"]`)) {
            return;
        }
    
        if (msg.tipo === "LEIDO") {
            document.querySelectorAll(".check").forEach(c => c.textContent = "✔✔");
            return;
        }
    
        const fecha = msg.fecha ? new Date(msg.fecha) : new Date();
        const fechaMsg = fecha.toDateString();
    
        // 📅 separador HOY / AYER
        if (ultimaFecha !== fechaMsg) {
    
            const separador = document.createElement("div");
            separador.className = "separador-fecha";
    
            const hoy = new Date().toDateString();
            const ayer = new Date(Date.now() - 86400000).toDateString();
    
            if (fechaMsg === hoy) separador.textContent = "HOY";
            else if (fechaMsg === ayer) separador.textContent = "AYER";
            else separador.textContent = fecha.toLocaleDateString();
    
            chatBox.appendChild(separador);
            ultimaFecha = fechaMsg;
        }
    
        const div = document.createElement("div");
    
        if (msg.id) div.setAttribute("data-id", msg.id);
    
        div.className = msg.tipo === "ADMIN" ? "msg-admin" : "msg-cliente";
    
        const hora = fecha.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    
        let check = "";

        if (msg.tipo === "ADMIN") {

         if (msg.estado === "ENVIADO") {
          check = `<span class="check">✔</span>`;
        }

         if (msg.estado === "RECIBIDO") {
          check = `<span class="check doble">✔✔</span>`;
        }

         if (msg.estado === "LEIDO") {
          check = `<span class="check doble azul">✔✔</span>`;
       }
}
        div.innerHTML = `
            <span>${msg.mensaje}</span>
            <div class="meta">
                <small>${hora}</small>
                ${check}
            </div>
        `;
    
        // 🎬 animación entrada
        div.style.opacity = "0";
        div.style.transform = "translateY(10px)";
    
        setTimeout(() => {
            div.style.transition = "all .2s ease";
            div.style.opacity = "1";
            div.style.transform = "translateY(0)";
        }, 50);
    
        const estaAbajo =
            chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight - 50;
    
        chatBox.appendChild(div);
    
        if (estaAbajo) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    
        // ✅ enviar recibido
        if (msg.tipo !== "ADMIN") {
            stompClient.send("/app/chat/recibido", {}, telefonoActivo);
        }
        guardarMensajeLocal(msg);
    }

    /* =========================
       PAGINACIÓN
    ========================== */
    function renderizarPaginacion(total) {
        let pag = document.getElementById("paginacion");
        if (!pag) {
            pag = document.createElement("div");
            pag.id = "paginacion";
            pag.className = "paginacion";
            contenedor.after(pag);
        }

        pag.innerHTML = `
            <button ${paginaActual === 1 ? "disabled" : ""} id="prev">⬅</button>
            <span>Página ${paginaActual} de ${total}</span>
            <button ${paginaActual === total ? "disabled" : ""} id="next">➡</button>
        `;

        document.getElementById("prev").onclick = () => {
            paginaActual--;
            renderizarMensajes();
        };
        document.getElementById("next").onclick = () => {
            paginaActual++;
            renderizarMensajes();
        };
    }

    /* =========================
       MARCAR LEÍDO
    ========================== */
    function marcarComoLeido(id) {
        fetch(`http://localhost:8080/api/mensajes/${id}/leido`, {
            method: "PUT",
            headers: getHeaders()
        });
    }

    /* =========================
       BADGE + 🔔 SONIDO
    ========================== */
    function actualizarBadge() {
        const badge = document.getElementById("badgeMensajes");
    
        if (!Array.isArray(mensajes)) return;
    
        const noLeidos = mensajes.filter(m => !m.leido).length;
    
        ultimoConteoNoLeidos = noLeidos;
    
        if (badge) {
            badge.textContent = noLeidos > 0 ? `(${noLeidos})` : "";
        }
    }

    /* =========================
       📊 ESTADÍSTICAS
    ========================== */
    function renderizarEstadisticas() {
        let total = mensajes.length;
        let noLeidos = mensajes.filter(m => !m.leido).length;
        let leidos = total - noLeidos;

        let stats = document.getElementById("statsMensajes");
        if (!stats) {
            stats = document.createElement("div");
            stats.id = "statsMensajes";
            stats.className = "dashboard";
            contenedor.before(stats);
        }

        stats.innerHTML = `
            <div class="card"><h4>Total</h4><span>${total}</span></div>
            <div class="card pendiente"><h4>No leídos</h4><span>${noLeidos}</span></div>
            <div class="card entregado"><h4>Leídos</h4><span>${leidos}</span></div>
        `;
    }

    /* =========================
       🔍 BUSCADOR
    ========================== */
    const buscador = document.createElement("input");
    buscador.placeholder = "🔍 Buscar mensajes...";
    buscador.className = "buscador";
    contenedor.before(buscador);

    buscador.oninput = () => {
        textoBusqueda = buscador.value;
        paginaActual = 1;
        renderizarMensajes();
    };

    /* =========================
       FILTROS
    ========================== */
    const filtrosHTML = `
        <div class="filtros">
            <button data="TODOS" class="activo">Todos</button>
            <button data="NO_LEIDOS">No leídos</button>
            <button data="LEIDOS">Leídos</button>
        </div>
    `;
    contenedor.before(document.createRange().createContextualFragment(filtrosHTML));

    document.querySelectorAll(".filtros button").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".filtros button")
                .forEach(b => b.classList.remove("activo"));
            btn.classList.add("activo");
            filtroActual = btn.getAttribute("data");
            paginaActual = 1;
            renderizarMensajes();
        };
    });

    /* =========================
       EXPORTAR
    ========================== */
    function exportarExcel() {
        const ws = XLSX.utils.json_to_sheet(mensajes);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mensajes");
        XLSX.writeFile(wb, "mensajes_estampaider.xlsx");
    }

    function exportarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text("Mensajes Estampaider", 10, 10);

        const rows = mensajes.map(m => [
            m.nombre,
            m.correo,
            m.mensaje,
            m.whatsapp || "",
            m.leido ? "Leído" : "No leído"
        ]);

        doc.autoTable({
            head: [["Nombre", "Correo", "Mensaje", "WhatsApp", "Estado"]],
            body: rows,
            startY: 20
        });

        doc.save("mensajes_estampaider.pdf");
    }

    const exportDiv = document.createElement("div");
    exportDiv.className = "exportar";
    exportDiv.innerHTML = `
        <button id="excel">📊 Excel</button>
        <button id="pdf">📄 PDF</button>
    `;
    contenedor.before(exportDiv);

    let ultimoTotalMensajes = 0;

function detectarNuevosMensajes(data) {

    if (ultimoTotalMensajes === 0) {
        ultimoTotalMensajes = data.length;
        return;
    }

    if (data.length > ultimoTotalMensajes) {

        if (!telefonoActivo) { // 🔥 SOLO si no estás en chat
            sonido.play().catch(() => {});
            mostrarToastGlobal("📩 Nuevo mensaje recibido", "success");
        }
    }

    ultimoTotalMensajes = data.length;
}

function mostrarNotificacionFlotante(mensajeObj) {

    let container = document.getElementById("notificaciones-container");

    if (!container) {
        container = document.createElement("div");
        container.id = "notificaciones-container";
        document.body.appendChild(container);
    }

    const div = document.createElement("div");
    div.className = "notificacion";

    div.innerHTML = `
        <h4>💬 ${mensajeObj.nombre || "Cliente"}</h4>
        <p>${mensajeObj.mensaje.substring(0, 50)}</p>
    `;

    // 👉 abrir chat al hacer click
    div.onclick = () => {
        abrirChat({
            nombre: mensajeObj.nombre || "Cliente",
            whatsapp: mensajeObj.telefono
        });
    };

    container.appendChild(div);

    while (container.children.length > 3) {
        container.removeChild(container.firstChild);
    }

    setTimeout(() => div.classList.add("show"), 50);

    setTimeout(() => {
        div.classList.remove("show");
        setTimeout(() => div.remove(), 400);
    }, 5000);
}

function cerrarChat() {
    document.getElementById("chat-container").classList.add("hidden");

    if (chatSubscription) {
        chatSubscription.unsubscribe();
        chatSubscription = null;
    }

    telefonoActivo = null;
}

function conectarWebSocket() {

    const socket = new SockJS("http://localhost:8080/ws");
    stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {

        console.log("🟢 Conectado WS");

        // 🔥 GLOBAL
        stompClient.subscribe("/topic/chat/global", (msg) => {

            let data;
            try {
                data = JSON.parse(msg.body);
            } catch {
                return;
            }
        
            if (!data || !data.mensaje) return;
            if (data.tipo === "ADMIN" && data.telefono !== telefonoActivo) return;
        
            const enChatAbierto = telefonoActivo === data.telefono;

        if (!enChatAbierto) {
            sonido.play().catch(() => {});
            mostrarNotificacionSistema(data);
            mostrarNotificacionFlotante(data);
        }
        
            // 💬 si estás en ese chat
            if (telefonoActivo === data.telefono) {
                agregarMensajeChat(data);
            }
        
            guardarMensajeLocal(data);
        });

    }, () => {
        console.log("🔴 WS desconectado... reconectando en 3s");

        setTimeout(() => {
            conectarWebSocket();
        }, 3000);
    });
}
function mostrarNotificacionSistema(data) {

    if (Notification.permission !== "granted") return;

    const noti = new Notification("💬 Nuevo mensaje", {
        body: `${data.nombre || "Cliente"}: ${data.mensaje}`,
        icon: "images/logo-estampaider.png"
    });

    noti.onclick = () => {
        window.focus();
    };
}

function mostrarTyping() {
    const chatBox = document.getElementById("chat-mensajes");

    let typing = document.getElementById("typing");

    if (!typing) {
        typing = document.createElement("div");
        typing.id = "typing";
        typing.className = "msg-cliente typing";
        typing.innerHTML = "Escribiendo<span class='dots'></span>";
        chatBox.appendChild(typing);
    }

    chatBox.scrollTop = chatBox.scrollHeight;

    clearTimeout(typing.timeout);

    typing.timeout = setTimeout(() => {
        typing.remove();
    }, 2000);
}

function actualizarChecks(color) {

    const checks = document.querySelectorAll(".msg-admin .check");

    checks.forEach(c => {
        c.textContent = "✔✔";
        c.style.color = color;
    });

}

function mostrarToastGlobal(mensaje, tipo = "info") {

    let toast = document.getElementById("toast-global");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-global";
        document.body.appendChild(toast);
    }

    toast.textContent = mensaje;
    toast.className = `toast show ${tipo}`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function actualizarEstadoMensaje(data) {

    const chatBox = document.getElementById("chat-mensajes");

    const mensajes = chatBox.querySelectorAll("[data-id]");

    mensajes.forEach(div => {

        if (div.getAttribute("data-id") === data.id) {

            const check = div.querySelector(".check");

            if (!check) return;

            if (data.tipo === "RECIBIDO") {
                check.textContent = "✔✔";
                check.classList.add("doble");
            }

            if (data.tipo === "LEIDO") {
                check.textContent = "✔✔";
                check.classList.add("doble", "azul");
            }
        }
    });
}
function guardarMensajeLocal(msg) {

    let chats = JSON.parse(localStorage.getItem("chats")) || {};

    if (!msg.telefono) return;

    if (!chats[msg.telefono]) {
        chats[msg.telefono] = [];
    }

    // 🚫 evitar duplicados
    if (msg.id && chats[msg.telefono].some(m => m.id === msg.id)) {
        return;
    }

    chats[msg.telefono].push(msg);

    localStorage.setItem("chats", JSON.stringify(chats));
}
    document.getElementById("excel").onclick = exportarExcel;
    document.getElementById("pdf").onclick = exportarPDF;

    let typingTimeout;

    document.getElementById("chat-input").addEventListener("input", () => {
    
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/chat/typing", {}, JSON.stringify({
                telefono: telefonoActivo,
                tipo: "ADMIN"
            }));
        }
    
        clearTimeout(typingTimeout);
    
        typingTimeout = setTimeout(() => {
            // dejar de escribir
        }, 2000);
    });

    /* =========================
       INICIO
    ========================== */
    cargarMensajes();
    conectarWebSocket();
    window.enviarMensajeChat = enviarMensajeChat;
    window.cerrarChat = cerrarChat;
    window.abrirChat = abrirChat;
});


