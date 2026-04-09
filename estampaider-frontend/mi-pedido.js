// 🔐 Verificar sesión antes de todo
const authData = sessionStorage.getItem("auth")
    ? JSON.parse(sessionStorage.getItem("auth"))
    : null;

if (!authData || !authData.token) {
    window.location.href = "admin/login.html";
}

document.addEventListener("DOMContentLoaded", async () => {

    const contenedor = document.getElementById("pedidos");
    const token = authData.token;

    // Mostrar nombre del usuario
    document.getElementById("nombreUsuario").textContent =
        "👤 " + authData.nombre;

    // 🔐 Validar sesión
    if (!token) {
        contenedor.innerHTML = `
            <p>⚠️ Debes iniciar sesión para consultar tus pedidos.</p>
            <button onclick="irLogin()">Iniciar sesión</button>
        `;
        return;
    }

    // 🔄 Mensaje mientras carga
    contenedor.innerHTML = "<p>🔎 Cargando tus pedidos...</p>";

    try {
        const res = await fetch(
            "http://localhost:8080/api/pedidos/mis-pedidos",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        if (res.status === 401) {
            sessionStorage.removeItem("auth");
            contenedor.innerHTML = `
                <p>🔐 Tu sesión ha expirado.</p>
                <button onclick="irLogin()">Iniciar sesión nuevamente</button>
            `;
            return;
        }

        if (res.status === 403) {
            contenedor.innerHTML = `
                <p>⛔ No tienes permiso para ver estos pedidos.</p>
            `;
            return;
        }

        if (!res.ok) {
            throw new Error("No se pudieron cargar los pedidos");
        }

        const pedidos = await res.json();

        if (!pedidos.length) {
            contenedor.innerHTML = `
                <p>📦 Aún no tienes pedidos registrados.</p>
                <button onclick="volver()">Ir a la tienda</button>
            `;
            return;
        }

        contenedor.innerHTML = pedidos.map(pedido => {

            const fecha = pedido.fecha
                ? new Date(pedido.fecha).toLocaleString()
                : "—";

            const detallesHTML = pedido.detalles?.length
                ? pedido.detalles.map(d => `
                    <li>
                        <strong>${d.producto}</strong> x ${d.cantidad} —
                        $${(d.precioUnitario * d.cantidad).toLocaleString("es-CO")}
                        ${d.notaPersonalizacion ? `<br><em style="color:#e67e22;">🎨 Personalización: ${d.notaPersonalizacion}</em>` : ""}
                    </li>
                `).join("")
                : "<li>Sin productos</li>";

            return `
                <div class="pedido-card estado-${pedido.estado}">
                    <h3>📦 Pedido #${pedido.id}</h3>
                    ${checklistEstado(pedido.estado)}
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Estado:</strong> ${pedido.estado}</p>
                    <p>
                        <strong>Pago:</strong>
                        <span class="pago ${pedido.estadoPago === 'PAGADO' ? 'pagado' : 'pendiente'}">
                            ${pedido.estadoPago === 'PAGADO' ? '✅ Pagado' : '⏳ Pendiente'}
                        </span>
                    </p>
                    <p><strong>Método:</strong> ${pedido.metodoPago}</p>
                    <ul>${detallesHTML}</ul>
                    <p class="total">
                        <strong>Total:</strong>
                        $${pedido.total.toLocaleString("es-CO")}
                    </p>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error(err);
        contenedor.innerHTML = "<p>⚠️ Error al cargar tus pedidos.</p>";
    }

    // Conectar chat después de cargar pedidos
    conectarChat();
});


/* ================================
   🔙 VOLVER A LA TIENDA
================================ */
function volver() {
    window.location.href = "index.html";
}

/* ================================
   🔐 IR AL LOGIN
================================ */
function irLogin() {
    window.location.href = "admin/login.html";
}


/* ================================
   📦 CHECKLIST VISUAL
================================ */
function checklistEstado(estado) {

    const estados = [
        { key: "RECIBIDO", label: "📝 Recibido" },
        { key: "PENDIENTE", label: "⏳ En proceso" },
        { key: "ENVIADO", label: "🚚 Enviado" },
        { key: "ENTREGADO", label: "📦 Entregado" }
    ];

    const indexActual = estados.findIndex(e => e.key === estado);

    return `
        <div class="estado-checklist">
            ${estados.map((e, index) => `
                <div class="check ${index <= indexActual ? "activo" : ""}">
                    ${e.label}
                </div>
            `).join("")}
        </div>
    `;
}


/* ================================
   🔎 BUSCADOR POR NÚMERO PEDIDO
================================ */
document.addEventListener("input", (e) => {
    if (e.target.id !== "buscarPedido") return;
    const texto = e.target.value.toLowerCase();
    const cards = document.querySelectorAll(".pedido-card");
    cards.forEach(card => {
        const titulo = card.querySelector("h3").textContent.toLowerCase();
        card.style.display = titulo.includes(texto) ? "block" : "none";
    });
});

function cerrarSesion() {
    sessionStorage.removeItem("auth");
    window.location.href = "index.html";
}

/* ================================
   💬 CHAT CLIENTE
================================ */

let stompClient = null;
let telefonoCliente = null;
let chatConectado = false; 

function conectarChat() {

    // Verificar que existe el teléfono en la sesión
    if (!authData || !authData.telefono) {
        console.error("❌ No hay teléfono en la sesión. Chat no disponible.");
        const chatSection = document.getElementById("chat-section");
        if (chatSection) {
            chatSection.innerHTML = `
                <p style="color:#e74c3c;">⚠️ Para usar el chat debes iniciar sesión nuevamente.</p>
                <button onclick="irLogin()">Iniciar sesión</button>
            `;
        }
        return;
    }

    // Normalizar teléfono
    telefonoCliente = authData.telefono.toString().replace(/\D/g, "");
    if (!telefonoCliente.startsWith("57")) {
        telefonoCliente = "57" + telefonoCliente;
    }

    console.log("📱 Teléfono cliente:", telefonoCliente);

    const socket = new SockJS("http://localhost:8080/ws");
    stompClient = Stomp.over(socket);
    stompClient.debug = function(str) {
        console.log("STOMP:", str);
    };

    stompClient.connect(
        {},
        async function () {
    
            console.log("🟢 Cliente conectado al chat");
    
            chatConectado = true;
    
            const btn = document.getElementById("btn-enviar");
            if (btn) btn.disabled = false;
    
            // SUSCRIPCIÓN PRINCIPAL
            stompClient.subscribe("/topic/chat/" + telefonoCliente, function (msg) {
    
                let data;
                try {
                    data = JSON.parse(msg.body);
                } catch (e) {
                    return;
                }
    
                console.log("📩 Cliente recibe:", data);
    
                if (!data) return;
    
                agregarMensaje(data);
            });
    
            // HISTORIAL
          //  await cargarHistorial();
    
            // ONLINE
            stompClient.send("/app/chat/online", {}, JSON.stringify(telefonoCliente));
        },
    
        function (error) {
            console.error("🔴 ERROR WS:", error);
            setTimeout(() => conectarChat(), 3000);
        }
    );
}

function enviarMensaje() {

    if (!stompClient || !stompClient.connected) {
        alert("⏳ Conectando al chat... intenta en 1 segundo");
        return;
    }

    const input = document.getElementById("chat-input");
    const texto = input.value.trim();

    if (!texto) return;

    const mensaje = {
        nombre: authData.nombre,
        mensaje: texto,
        telefono: telefonoCliente,
        tipo: "CLIENTE"
    };

    // 🔥 ENVIAR AL BACKEND
    stompClient.send("/app/chat", {}, JSON.stringify(mensaje));

    input.value = "";
}

// Indicador de escritura
document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.addEventListener("input", () => {
            if (stompClient && stompClient.connected && telefonoCliente) {
                stompClient.send("/app/chat/typing", {}, JSON.stringify({
                    telefono: telefonoCliente,
                    tipo: "CLIENTE"
                }));
            }
        });

        // Enviar con Enter
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensaje();
            }
        });
    }
});

function agregarMensaje(msg) {

    const chatBox = document.getElementById("chat-mensajes");
    if (!chatBox) return;

    if (!msg || !msg.mensaje) return;

    // Si no viene tipo, asumir ADMIN (mensaje del admin al cliente)
    if (!msg.tipo) {
        msg.tipo = "ADMIN";
    }

    if (msg.tipo === "RECIBIDO" || msg.tipo === "LEIDO") return;

    // Evitar duplicados por ID
    if (
        chatBox.lastChild &&
        chatBox.lastChild.textContent.includes(msg.mensaje)
    ) {
        return;
    }

    const div = document.createElement("div");
    if (msg.id) div.setAttribute("data-id", msg.id);

    div.className = msg.tipo === "CLIENTE" ? "msg-cliente" : "msg-admin";

    const fecha = msg.fecha ? new Date(msg.fecha) : new Date();
    const hora = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <span>${msg.mensaje}</span>
        <div class="meta"><small>${hora}</small></div>
    `;

    // Animación de entrada
    div.style.opacity = "0";
    div.style.transform = "translateY(8px)";
    setTimeout(() => {
        div.style.transition = "all .2s ease";
        div.style.opacity = "1";
        div.style.transform = "translateY(0)";
    }, 30);

    chatBox.appendChild(div);

    const estaAbajo =
        chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 100;

    if (estaAbajo) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

async function cargarHistorial() {

    const chatBox = document.getElementById("chat-mensajes");
    if (!chatBox) return;

    chatBox.innerHTML = "";

    try {
        const res = await fetch("http://localhost:8080/api/chat/" + telefonoCliente);

        if (!res.ok) {
            console.warn("No se pudo cargar el historial del chat");
            return;
        }

        const mensajes = await res.json();
        mensajes.forEach(m => agregarMensaje(m));

    } catch (err) {
        console.error("Error cargando historial:", err);
    }
}

function mostrarTypingCliente() {

    const chatBox = document.getElementById("chat-mensajes");
    if (!chatBox) return;

    let typing = document.getElementById("typing-cliente");

    if (!typing) {
        typing = document.createElement("div");
        typing.id = "typing-cliente";
        typing.className = "msg-admin typing";
        typing.innerHTML = "Escribiendo<span class='dots'></span>";
        chatBox.appendChild(typing);
    }

    chatBox.scrollTop = chatBox.scrollHeight;

    clearTimeout(typing.timeout);
    typing.timeout = setTimeout(() => typing.remove(), 2000);
}
