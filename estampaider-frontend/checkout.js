// ============================================================
//  checkout.js  —  Estampaider
//  Gestiona el formulario de confirmación de compra
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // 🔐 Proteger checkout: redirigir si no hay sesión activa
    const authCheckout = JSON.parse(sessionStorage.getItem("auth"));

    if (!authCheckout || !authCheckout.token) {
        sessionStorage.setItem("redirectAfterLogin", "checkout.html");
        window.location.href = "admin/login.html";
        return;
    }

    // ── Autocompletar datos del usuario autenticado ──────────
    if (authCheckout && authCheckout.nombre) {
        const campoCliente = document.getElementById("cliente");
        if (campoCliente) campoCliente.value = authCheckout.nombre;
    }

    if (authCheckout && authCheckout.telefono) {
        const campoTelefono = document.getElementById("telefono");
        if (campoTelefono) campoTelefono.value = authCheckout.telefono;
    }

    // ── Cargar carrito ───────────────────────────────────────
    const carrito   = JSON.parse(localStorage.getItem("carrito")) || [];
    const resumen   = document.getElementById("resumen");
    const totalSpan = document.getElementById("total");
    const btnConfirmar = document.getElementById("confirmar");

    if (!Array.isArray(carrito) || carrito.length === 0) {
        alert("El carrito está vacío");
        window.location.href = "carrito.html";
        return;
    }

    // ── Renderizar resumen del pedido ────────────────────────
    let total = 0;
    resumen.innerHTML = "";

    carrito.forEach(item => {
        const precio   = Number(item.precio)   || 0;
        const cantidad = Number(item.cantidad) || 0;
        const subtotal = precio * cantidad;
        total += subtotal;

        const div = document.createElement("div");
        div.classList.add("item");
        div.innerHTML = `
            <div class="item-info">
                <strong>${item.nombre}</strong>
                <span>${cantidad} x $${precio.toLocaleString("es-CO")} = $${subtotal.toLocaleString("es-CO")}</span>
            </div>
        `;
        resumen.appendChild(div);
    });

    totalSpan.textContent = total.toLocaleString("es-CO");

    // ── Cargar métodos de pago ───────────────────────────────
    let metodoPagoSeleccionado = null;

    fetch("http://localhost:8080/api/metodos-pago")
        .then(res => res.json())
        .then(metodos => {

            const cont = document.getElementById("metodosPago");

            metodos.forEach(m => {

                const div = document.createElement("div");
                div.className = "metodo-pago";

                div.innerHTML = `
                    <label>
                        <input type="radio" name="metodoPago">
                        <strong>${m.nombre}</strong><br>
                        <small>${m.descripcion}</small>
                    </label>

                    <div class="info-pago" style="display:none">
                        ${m.tipo === "TRANSFERENCIA"
                            ? `📲 Número: <strong>${m.dato}</strong>`
                            : ""}
                        ${m.tipo === "PRESENCIAL"
                            ? `📍 Dirección: <strong>${m.dato}</strong>`
                            : ""}
                        ${m.tipo && m.tipo.toUpperCase().includes("QR")
                            ? `<img src="http://localhost:8080/images/qr-nequi.png" style="max-width:200px" alt="Código QR de pago">`
                            : ""}
                    </div>
                `;

                div.querySelector("input").addEventListener("change", () => {
                    metodoPagoSeleccionado = m.nombre;

                    document.querySelectorAll(".info-pago")
                        .forEach(i => i.style.display = "none");

                    div.querySelector(".info-pago").style.display = "block";
                });

                cont.appendChild(div);
            });
        })
        .catch(() => {
            const cont = document.getElementById("metodosPago");
            if (cont) {
                cont.innerHTML = "<p>No se pudieron cargar los métodos de pago. Contáctanos por WhatsApp.</p>";
            }
        });

    // ── Confirmar pedido ─────────────────────────────────────
    let enviando = false;

    btnConfirmar.addEventListener("click", () => {

        if (enviando) return;

        // 1. Validar datos del cliente
        const cliente       = document.getElementById("cliente").value.trim();
        const telefono      = document.getElementById("telefono").value.trim();
        const telefonoLimpio = telefono.replace(/\D/g, "");

        if (!cliente || telefonoLimpio.length < 10) {
            alert("Ingresa un nombre y un número de WhatsApp válido (mínimo 10 dígitos).");
            return;
        }

        // 2. Validar datos de envío
        const direccion    = document.getElementById("direccion").value.trim();
        const ciudad       = document.getElementById("ciudad").value.trim();
        const departamento = document.getElementById("departamento").value.trim();
        const barrio       = document.getElementById("barrio").value.trim();
        const referencia   = document.getElementById("referencia").value.trim();

        if (!direccion || !ciudad || !departamento) {
            alert("Completa los datos de envío obligatorios: dirección, ciudad y departamento.");
            return;
        }

        // 3. Validar método de pago
        if (!metodoPagoSeleccionado) {
            alert("Selecciona un método de pago.");
            return;
        }

        // 4. Bloquear botón y enviar
        enviando = true;
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = "⏳ Procesando pedido...";

        const pedido = {
            cliente,
            telefono,
            direccion,
            ciudad,
            departamento,
            barrio,
            referencia,
            metodoPago: metodoPagoSeleccionado,
            total,
            detalles: carrito.map(item => ({
                producto:       item.nombre,
                cantidad:       item.cantidad,
                precioUnitario: Number(item.precio) || 0
            }))
        };

        fetch("http://localhost:8080/api/pedidos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + authCheckout.token
            },
            body: JSON.stringify(pedido)
        })
        .then(res => {
            if (!res.ok) throw new Error("Error al registrar el pedido");
            return res.json();
        })
        .then(pedidoGuardado => {
            localStorage.setItem("pedidoId", pedidoGuardado.id);
            localStorage.removeItem("carrito");
            window.location.href = "gracias.html";
        })
        .catch(() => {
            enviando = false;
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = "Confirmar compra 🧾";
            alert("❌ No se pudo registrar el pedido. Intenta de nuevo o contáctanos por WhatsApp.");
        });
    });
});
