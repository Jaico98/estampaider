document.addEventListener("DOMContentLoaded", () => {
    /* =========================
       🔐 PROTECCIÓN ADMIN
    ========================== */
    const auth = JSON.parse(sessionStorage.getItem("auth"));

    if (!auth) {
        window.location.href = "admin/login.html";
    } else {
        if (auth.rol?.trim() !== "ADMIN") {
            window.location.href = "admin/login.html";
        }
    }
    
    function getAuthHeaders() {
    const auth = JSON.parse(sessionStorage.getItem("auth"));

    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + auth.token
    };
}   

    function logout() {
        sessionStorage.removeItem("auth");
        window.location.href = "admin/login.html";
    }    

    let chartEstados = null;
    let chartVentas = null;
    let filtroFechaVenta = null;
    let ultimoTotalPedidos = 0;
    let pedidosVistos = new Set();
    let pedidosNuevos = new Set();
    const sonido = new Audio("notification.mp3");

    /* =========================
       🔔 TOAST GLOBAL
    ========================== */
    function mostrarToast(mensaje, tipo = "info") {
        const toast = document.getElementById("toast");
        if (!toast) return;

        toast.textContent = mensaje;
        toast.className = "";
        toast.classList.add("show", `toast-${tipo}`);

        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function generarMensajeWhatsApp(pedido) {

        const tipoCliente = obtenerTipoCliente(pedido.telefono);
    
        const fecha = pedido.fecha
            ? new Date(pedido.fecha).toLocaleDateString()
            : "—";
    
        const productos = pedido.detalles?.map(d =>
            `• ${d.producto} x ${d.cantidad}`
        ).join("\n") || "• Sin productos";
    
        let saludo = `Hola *${pedido.cliente || "Cliente"}* 👋`;
        let extra = "";
    
        if (tipoCliente?.clase === "vip") {
            extra = "👑 *Gracias por ser uno de nuestros mejores clientes.*\n🎁";
        } 
        else if (tipoCliente?.clase === "recurrente") {
            extra = "🔁 *Gracias por confiar nuevamente en Estampaider.*\n✨";
        } 
        else if (tipoCliente?.clase === "nuevo") {
            extra = "🆕 *¡Bienvenido a Estampaider!*\n🙌 Gracias por tu primera compra.";
        }
    
        return `
    ${saludo}
    Somos *Estampaider* 🎨👕
    
    📦 *Pedido #${pedido.id}*
    📅 Fecha: ${fecha}
    📦 Estado: *${pedido.estado}*
    💳 Método de pago: ${pedido.metodoPago || "No especificado"}
    💰 Estado de pago: ${pedido.estadoPago}
    💰 Total: *$${pedido.total.toLocaleString()}*
    
    🛒 Productos:
    ${productos}
    
    ${extra}
    📲 Envíanos el comprobante a este WhatsApp
    Cualquier duda estamos atentos 😊
        `.trim();
    }        
    
    /* =========================
       📦 ELEMENTOS DOM
    ========================== */
    const btnResetFiltros = document.getElementById("resetFiltros");
    const contenedor = document.getElementById("pedidos");
    const filtros = document.querySelectorAll(".filtros button");
    const buscador = document.getElementById("buscarPedido");
    const btnOrdenFecha = document.getElementById("ordenFecha");
    const filtrosPago = document.querySelectorAll(".filtros-pago button");
    const filtrosMetodo = document.querySelectorAll(".filtros-metodo button");

    const btnPrev = document.getElementById("prevPagina");
    const btnNext = document.getElementById("nextPagina");
    const infoPagina = document.getElementById("infoPagina");

    const btnExcel = document.getElementById("exportExcel");
    const btnPDF = document.getElementById("exportPDF");

    const modalHistorial = document.getElementById("modalHistorial");
    const tablaHistorial = document.getElementById("tablaHistorial");
    const clienteHistorial = document.getElementById("clienteHistorial");
    const cerrarHistorial = document.getElementById("cerrarHistorial");

    /* =========================
       📊 ESTADO GLOBAL
    ========================== */
    let pedidosGlobal = [];
    let primeraCarga = true;
    let estadoActual = "TODOS";
    let textoBusqueda = "";
    let ordenFecha = "DESC";
    let filtroPago = "TODOS"; // TODOS | PAGADO | NO_PAGADO
    let filtroMetodoPago = "TODOS";


    let paginaActual = 1;
    const pedidosPorPagina = 5;
   
    /* =========================
       📥 CARGAR PEDIDOS
    ========================== */
    function cargarPedidos() {

        const auth = JSON.parse(sessionStorage.getItem("auth"));
    
        if (!auth || !auth.token) {
            alert("Sesión expirada. Inicia sesión nuevamente.");
            window.location.href = "admin/login.html";
            return;
        }
    
        fetch("http://localhost:8080/api/pedidos", {
            headers: getAuthHeaders()
        })

        .then(res => {
            if (!res.ok) throw new Error("Error al cargar pedidos");
            return res.json();
        })
        .then(pedidos => {
            pedidos.forEach(p => {
                if (!pedidosVistos.has(p.id)) {
                    pedidosNuevos.add(p.id);
                }
            });
        
       if (pedidos.length > ultimoTotalPedidos && ultimoTotalPedidos !== 0) {
         sonido.play();
         mostrarToast("🚨 Nuevo pedido recibido", "success");
       }

       if (pedidos.length === ultimoTotalPedidos && !primeraCarga) {
        return;
    }
            ultimoTotalPedidos = pedidos.length;
            pedidosGlobal = pedidos;
            actualizarDashboard(pedidos);
            cargarStats();
            actualizarGraficas(pedidos);
            calcularTotalPagado(pedidos);
            renderPedidos();
            primeraCarga = false;
            activarDashboardClicks();
        })

        .catch(() => {
            contenedor.innerHTML = "<p>Error al cargar pedidos</p>";
            mostrarToast("Error al cargar pedidos", "error");
        });
    }    
    /* =========================
       📊 DASHBOARD
    ========================== */
    function actualizarDashboard(pedidos) {

        const total = pedidos.length;
        const pendientes = pedidos.filter(p =>
            p.estado === "PENDIENTE" || p.estado === "RECIBIDO"
        ).length;
        document.title = `(${pendientes}) Pedidos - Estampaider`;
        const enviados = pedidos.filter(p => p.estado === "ENVIADO").length;
        const entregadosPedidos = pedidos.filter(p => p.estado === "ENTREGADO");

        const totalVentas = entregadosPedidos.reduce(
            (acc, p) => acc + (p.total || 0), 0
        );

        animarContador("statTotal", total);
        animarContador("statPendientes", pendientes);
        animarContador("statEnviados", enviados);
        animarContador("statEntregados", entregadosPedidos.length);
        animarContador("statVentas", totalVentas, true);

        /* 🎟️ Ticket promedio */
        const promedio = entregadosPedidos.length
            ? Math.round(totalVentas / entregadosPedidos.length)
            : 0;

        animarContador("statPromedio", promedio, true);

        /* 👑 Cliente top */
        const clientes = {};

        entregadosPedidos.forEach(p => {
            if (!p.cliente) return;
            clientes[p.cliente] = (clientes[p.cliente] || 0) + (p.total || 0);
        });

        let clienteTop = "—";
        let maxCompra = 0;

        for (const cliente in clientes) {
            if (clientes[cliente] > maxCompra) {
                maxCompra = clientes[cliente];
                clienteTop = cliente;
            }
        }

        const clienteEl = document.getElementById("statClienteTop");
        if (clienteEl) {
            clienteEl.textContent =
                clienteTop !== "—"
                    ? `${clienteTop} ($${maxCompra.toLocaleString()})`
                    : "—";
        }
    }
    /* =========================
   🧩 DASHBOARD INTERACTIVO
========================= */
function activarDashboardClicks() {

    const cardTotal = document.querySelector(".card:not(.pendiente):not(.enviado):not(.entregado):not(.dinero)");
    const cardPendiente = document.querySelector(".card.pendiente");
    const cardEnviado = document.querySelector(".card.enviado");
    const cardEntregado = document.querySelector(".card.entregado");
    const cardVentas = document.querySelector(".card.dinero");

    if (cardTotal) {
        cardTotal.onclick = () => aplicarFiltroDashboard("TODOS");
    }

    if (cardPendiente) {
        cardPendiente.onclick = () => aplicarFiltroDashboard("PENDIENTE");
    }

    if (cardEnviado) {
        cardEnviado.onclick = () => aplicarFiltroDashboard("ENVIADO");
    }

    if (cardEntregado) {
        cardEntregado.onclick = () => aplicarFiltroDashboard("ENTREGADO");
    }

    if (cardVentas) {
        cardVentas.onclick = () => aplicarFiltroDashboard("ENTREGADO");
    }
}
function aplicarFiltroDashboard(estado) {

    estadoActual = estado;
    paginaActual = 1;
    filtroFechaVenta = null;

    filtros.forEach(b =>
        b.classList.toggle("activo", b.dataset.estado === estado)
    );

    renderPedidos();

    mostrarToast(
        estado === "TODOS"
            ? "Mostrando todos los pedidos"
            : `Filtrando pedidos ${estado.toLowerCase()}`,
        "info"
    );
}

    /* =========================
       📊 GRÁFICAS
    ========================== */
    function actualizarGraficas(pedidos) {

        /* PEDIDOS POR ESTADO */
        const estados = { PENDIENTE: 0, ENVIADO: 0, ENTREGADO: 0 };

        const pedidosFiltrados = pedidos.filter(p => {
            if (filtroMetodoPago === "TODOS") return true;
            return p.metodoPago === filtroMetodoPago;
        });
        
        pedidosFiltrados.forEach(p => {
            if (estados[p.estado] !== undefined) estados[p.estado]++;
        });        

        if (chartEstados) chartEstados.destroy();

        chartEstados = new Chart(
            document.getElementById("graficaEstados"),
            {
                type: "doughnut",
                data: {
                    labels: ["Pendientes", "Enviados", "Entregados"],
                    datasets: [{
                        data: Object.values(estados),
                        backgroundColor: ["#facc15", "#3b82f6", "#22c55e"]
                    }]
                },
                options: { responsive: true }
            }
        );

        /* VENTAS POR FECHA */
        const ventasPorFecha = {};

        pedidos
            .filter(p => p.estado === "ENTREGADO")
            .forEach(p => {
                const fecha = p.fecha?.split("T")[0] || "Sin fecha";
                ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + (p.total || 0);
            });

        const fechas = Object.keys(ventasPorFecha);
        const totales = Object.values(ventasPorFecha);

        if (chartVentas) chartVentas.destroy();

        chartVentas = new Chart(
            document.getElementById("graficaVentas"),
            {
                type: "bar",
                data: {
                    labels: fechas,
                    datasets: [{
                        label: "Ventas ($)",
                        data: totales,
                        backgroundColor: "#22c55e"
                    }]
                },
                options: {
                    responsive: true,
                    onClick: (_, elements) => {
                        if (!elements.length) return;

                        filtroFechaVenta = fechas[elements[0].index];
                        estadoActual = "ENTREGADO";
                        paginaActual = 1;

                        filtros.forEach(b =>
                            b.classList.toggle("activo", b.dataset.estado === "ENTREGADO")
                        );

                        renderPedidos();
                    },
                    scales: { y: { beginAtZero: true } }
                }
            }
        );
    }

    function animarContador(id, valorFinal, esDinero = false) {
        const el = document.getElementById(id);
        if (!el) return;

        let valor = 0;
        const incremento = Math.ceil(valorFinal / 30);

        const intervalo = setInterval(() => {
            valor += incremento;
            if (valor >= valorFinal) {
                valor = valorFinal;
                clearInterval(intervalo);
            }
            el.textContent = esDinero ? `$${valor.toLocaleString()}` : valor;
        }, 20);
    }
    function verHistorial(telefono, nombreCliente) {

        if (!telefono) {
            mostrarToast("Este cliente no tiene teléfono", "error");
            return;
        }
    
        const pedidosCliente = pedidosGlobal.filter(p => p.telefono === telefono);
    
        if (!pedidosCliente.length) {
            mostrarToast("Este cliente no tiene historial", "info");
            return;
        }
    
        tablaHistorial.innerHTML = "";
    
        let totalGastado = 0;
        let entregados = 0;
    
        pedidosCliente.forEach(p => {
            totalGastado += p.total || 0;
            if (p.estado === "ENTREGADO") entregados++;
    
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>#${p.id}</td>
                <td>${p.fecha ? new Date(p.fecha).toLocaleDateString() : "—"}</td>
                <td>${p.estado}</td>
                <td>$${p.total.toLocaleString()}</td>
            `;
            tablaHistorial.appendChild(fila);
        });
    
        const promedio = entregados
            ? Math.round(totalGastado / entregados)
            : 0;
    
        let tipoCliente = "🆕 Cliente nuevo";
        if (entregados >= 3) tipoCliente = "🔁 Cliente recurrente";
        if (totalGastado >= 200000) tipoCliente = "👑 Cliente VIP";
    
        clienteHistorial.innerHTML = `
            <strong>${nombreCliente || "Cliente"}</strong><br>
            📞 ${telefono}<br><br>
    
            🧾 Pedidos totales: <strong>${pedidosCliente.length}</strong><br>
            ✅ Entregados: <strong>${entregados}</strong><br>
            💰 Total gastado: <strong>$${totalGastado.toLocaleString()}</strong><br>
            📈 Ticket promedio: <strong>$${promedio.toLocaleString()}</strong><br>
            🏷️ Tipo: <strong>${tipoCliente}</strong>
        `;
    
        modalHistorial.style.display = "block";
    }
    function obtenerTipoCliente(telefono) {
        if (!telefono) return null;
    
        const pedidosCliente = pedidosGlobal.filter(
            p => p.telefono === telefono && p.estado === "ENTREGADO"
        );
    
        const totalGastado = pedidosCliente.reduce(
            (acc, p) => acc + (p.total || 0), 0
        );
    
        if (totalGastado >= 200000) {
            return { texto: "👑 Cliente VIP", clase: "vip" };
        }
    
        if (pedidosCliente.length >= 3) {
            return { texto: "🔁 Recurrente", clase: "recurrente" };
        }
    
        if (pedidosCliente.length >= 1) {
            return { texto: "🆕 Nuevo", clase: "nuevo" };
        }
    
        return null;
    }    
    
    /* =========================
       🎯 RENDER PEDIDOS
    ========================== */
    function renderPedidos() {

        contenedor.innerHTML = "";
        let pedidosFiltrados = [...pedidosGlobal];

        if (estadoActual !== "TODOS") {
            pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === estadoActual);
        }
        if (filtroPago === "PAGADO") {
            pedidosFiltrados = pedidosFiltrados.filter(
                p => p.estadoPago === "PAGADO"
            );
        }
        
        if (filtroPago === "NO_PAGADO") {
            pedidosFiltrados = pedidosFiltrados.filter(
                p => !p.estadoPago || p.estadoPago !== "PAGADO"
            );
        }

        // 🔹 FILTRO POR MÉTODO DE PAGO
        if (filtroMetodoPago !== "TODOS") {
            pedidosFiltrados = pedidosFiltrados.filter(
                p => p.metodoPago === filtroMetodoPago
            );
        }
        
        if (filtroFechaVenta) {
            pedidosFiltrados = pedidosFiltrados.filter(p =>
                p.fecha && p.fecha.startsWith(filtroFechaVenta)
            );
        }        

        if (textoBusqueda.trim()) {
            const t = textoBusqueda.toLowerCase();
            pedidosFiltrados = pedidosFiltrados.filter(p =>
                p.id?.toString().includes(t) ||
                p.cliente?.toLowerCase().includes(t) ||
                p.telefono?.includes(t)
            );
        }

        pedidosFiltrados.sort((a, b) => {
            const fa = a.fecha ? new Date(a.fecha) : new Date(0);
            const fb = b.fecha ? new Date(b.fecha) : new Date(0);
            return ordenFecha === "DESC" ? fb - fa : fa - fb;
        });

        if (!pedidosFiltrados.length) {
            contenedor.innerHTML = "<p>No hay pedidos.</p>";
            infoPagina.textContent = "";
            return;
        }

        const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;

        const inicio = (paginaActual - 1) * pedidosPorPagina;
        const pedidosPagina = pedidosFiltrados.slice(inicio, inicio + pedidosPorPagina);

        pedidosPagina.forEach(pedido => {
            const div = document.createElement("div");

            if (pedidosNuevos.has(pedido.id)) {
                div.classList.add("nuevo-pedido");
            }
            if (!pedido.visto) {
             div.style.border = "2px solid #22c55e";
              }
            const tipoCliente = obtenerTipoCliente(pedido.telefono);
            div.className = `pedido-card estado-${pedido.estado}${
                tipoCliente ? `cliente-${tipoCliente.clase}`:""
        }`;

            div.innerHTML = `
                <div class="estado-badge estado-${pedido.estado}">${pedido.estado}</div>
                ${pedido.estadoPago ? `
                    <div class="pago-badge ${pedido.estadoPago === 'PAGADO' ? 'pagado' : 'pendiente'}">
                        💳 ${pedido.estadoPago}
                    </div>
                ` : ''}                
                ${tipoCliente ? `<div class="cliente-badge ${tipoCliente.clase}">${tipoCliente.texto}</div>` : ""}
                <h3>Pedido #${pedido.id}</h3>
                <p><strong>Fecha:</strong> ${
                pedido.fecha ? new Date(pedido.fecha).toLocaleString() : "—"
                }</p>

                <ul>
                    ${pedido.detalles?.map(d =>
                        `<li>${d.producto} x ${d.cantidad} — $${(d.precioUnitario * d.cantidad).toLocaleString()}</li>`
                    ).join("") || "<em>Sin productos</em>"}
                </ul>

                <p><strong>Total:</strong> $${pedido.total.toLocaleString()}</p>
            <p>
                <strong>💳 Método de pago:</strong>
               ${pedido.metodoPago || "No definido"}
            </p>
            <p>
               <strong>Estado de pago:</strong>
               ${pedido.estadoPago === "PAGADO"
               ? "💰 PAGADO"
               : "⏳ PENDIENTE"}
            </p>

                <div class="acciones">
                    <button class="whatsapp">📲 WhatsApp</button>
                    <button class="btn-historial">🧾 Historial</button>
                    <button class="estado" data-estado="ENVIADO">📦 Enviar</button>
                    <button class="estado" data-estado="ENTREGADO">✅ Entregado</button>
                    ${pedido.estadoPago !== "PAGADO" ? `
                        <button class="pagar">💰 Marcar pagado</button>
                    ` : ''}                    
                    <button class="eliminar">🗑️ Eliminar</button> 
                </div>
                
            `;

            div.querySelector(".whatsapp").onclick = () => {
             if (!pedido.telefono) {
             mostrarToast("Este pedido no tiene teléfono", "error");
             return;
        }

            const mensaje = generarMensajeWhatsApp(pedido);
            let telefono = pedido.telefono || "";

            if (!telefono.startsWith("57")) {
            telefono = "57" + telefono;
            }

            const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, "_blank");
        };

            div.querySelector(".btn-historial").onclick = () =>
                verHistorial(pedido.telefono, pedido.cliente);
            const btnPagar = div.querySelector(".pagar");
if (btnPagar) {
    btnPagar.onclick = () => {

        if (!confirm(`¿Marcar el pedido #${pedido.id} como PAGADO?`)) return;

        fetch(`http://localhost:8080/api/pedidos/${pedido.id}/pago`, {
            method: "PUT",
            headers: getAuthHeaders()
        })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(() => {
            mostrarToast("Pago marcado como PAGADO 💰", "success");
            cargarPedidos();
        })
        .catch(() => {
            mostrarToast("Error al marcar el pago", "error");
        });
    };
}
            div.querySelectorAll(".estado").forEach(btn => {
                if (pedido.estado === "ENTREGADO") {
                    btn.disabled = true;
                } else if (btn.dataset.estado === pedido.estado) {
                    btn.disabled = true;
                }
            
                btn.onclick = () => {
                    const nuevoEstado = btn.dataset.estado;
                    div.querySelectorAll(".estado").forEach(b => b.disabled = true);
                    fetch(`http://localhost:8080/api/pedidos/${pedido.id}/estado?estado=${nuevoEstado}`, {
                        method: "PUT",
                        headers: getAuthHeaders()
                    })
                    .then(res => {
                        if (!res.ok) throw new Error();
                        return res.text();
                    })
                    .then(() => {
                        mostrarToast(
                            nuevoEstado === "ENTREGADO"
                                ? "Pedido marcado como ENTREGADO ✅"
                                : "Pedido marcado como ENVIADO 📦",
                            "success"
                        );
            
                        // 🔥 animación visual
                        div.classList.add("actualizado");
            
                        setTimeout(() => {
                            cargarPedidos();
                        }, 600);
                    })
                    .catch(() => {
                        mostrarToast("Error al actualizar el pedido", "error");
                    });
                };
            });            

            div.querySelector(".eliminar").onclick = () => {
                if (!confirm(`¿Eliminar pedido #${pedido.id}?`)) return;
                fetch(`http://localhost:8080/api/pedidos/${pedido.id}`, {
                     method: "DELETE",
                     headers: getAuthHeaders()
                    })
                    .then(res => {
                        if (!res.ok) throw new Error();
                        cargarPedidos();
                     })
                     .catch(() => mostrarToast("Error al eliminar", "error"));
                     
            };

            contenedor.appendChild(div);
        });

        infoPagina.textContent = `Página ${paginaActual} de ${totalPaginas}`;
        btnPrev.disabled = paginaActual === 1;
        btnNext.disabled = paginaActual === totalPaginas;
    }

    /* =========================
       🔄 RESET FILTROS
    ========================== */
    if (btnResetFiltros) {
    btnResetFiltros.onclick = () => {
        estadoActual = "TODOS";
        textoBusqueda = "";
        filtroFechaVenta = null;
        ordenFecha = "DESC";
        paginaActual = 1;
        filtroPago = "TODOS";
        filtroMetodoPago = "TODOS";

        // UI
        buscador.value = "";
        btnOrdenFecha.textContent = "📅 Fecha ↓ (Recientes primero)";
    
        filtros.forEach(b => {
            b.classList.remove("activo");
            if (b.dataset.estado === "TODOS") {
                b.classList.add("activo");
            }
        });
        filtrosPago.forEach(b => {
            b.classList.remove("activo");
            if (b.dataset.pago === "TODOS") {
                b.classList.add("activo");
            }
        });
        filtrosMetodo.forEach(b => {
            b.classList.remove("activo");
            if (b.dataset.metodo === "TODOS") {
                b.classList.add("activo");
            }
        });             
    
        renderPedidos();
        actualizarDashboard(pedidosGlobal);
        actualizarGraficas(pedidosGlobal);
    
        mostrarToast("Filtros reiniciados correctamente", "info");
    };
}
    function exportarExcel() {

        if (!pedidosGlobal.length) {
            mostrarToast("No hay pedidos para exportar", "error");
            return;
        }
    
        const datos = pedidosGlobal.map(p => ({
            ID: p.id,
            Cliente: p.cliente || "—",
            Teléfono: p.telefono || "—",
            Fecha: p.fecha ? new Date(p.fecha).toLocaleDateString() : "—",
            Estado: p.estado,
            Total: p.total || 0
        }));
    
        const hoja = XLSX.utils.json_to_sheet(datos);
        const libro = XLSX.utils.book_new();
    
        XLSX.utils.book_append_sheet(libro, hoja, "Pedidos");
    
        XLSX.writeFile(libro, "pedidos_estampaider.xlsx");
    
        mostrarToast("Excel exportado correctamente 📊", "success");
    }
    function exportarPDF() {

        if (!pedidosGlobal.length) {
            mostrarToast("No hay pedidos para exportar", "error");
            return;
        }
    
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
    
        doc.text("Reporte de Pedidos - Estampaider", 14, 15);
    
        const filas = pedidosGlobal.map(p => ([
            p.id,
            p.cliente || "—",
            p.telefono || "—",
            p.fecha ? new Date(p.fecha).toLocaleDateString() : "—",
            p.estado,
            `$${(p.total || 0).toLocaleString()}`
        ]));
    
        doc.autoTable({
            head: [["ID", "Cliente", "Teléfono", "Fecha", "Estado", "Total"]],
            body: filas,
            startY: 20
        });
    
        doc.save("pedidos_estampaider.pdf");
    
        mostrarToast("PDF exportado correctamente 📄", "success");
    }
    
    /* =========================
       🎛️ EVENTOS
    ========================== */
    filtros.forEach(btn => {
        btn.onclick = () => {
            filtros.forEach(b => b.classList.remove("activo"));
            btn.classList.add("activo");
            estadoActual = btn.dataset.estado;
            paginaActual = 1;
            renderPedidos();
        };
    });
    btnExcel.onclick = exportarExcel;
    btnPDF.onclick = exportarPDF;

    buscador.oninput = () => {
        textoBusqueda = buscador.value;
        paginaActual = 1;
        renderPedidos();
    };

    btnOrdenFecha.onclick = () => {
        ordenFecha = ordenFecha === "DESC" ? "ASC" : "DESC";
        paginaActual = 1;
    
        // ⚠️ Al ordenar manualmente, se limpia filtro por gráfica
        filtroFechaVenta = null;
    
        btnOrdenFecha.textContent =
            ordenFecha === "DESC"
                ? "📅 Fecha ↓ (Recientes primero)"
                : "📅 Fecha ↑ (Antiguos primero)";
    
        mostrarToast(
            ordenFecha === "DESC"
                ? "Mostrando pedidos más recientes"
                : "Mostrando pedidos más antiguos",
            "info"
        );
    
        renderPedidos();
    };    
    filtrosPago.forEach(btn => {
        btn.onclick = () => {
    
            filtrosPago.forEach(b => b.classList.remove("activo"));
            btn.classList.add("activo");
    
            filtroPago = btn.dataset.pago;
            paginaActual = 1;
    
            renderPedidos();
    
            mostrarToast(
                filtroPago === "TODOS"
                    ? "Mostrando todos los pagos"
                    : filtroPago === "PAGADO"
                        ? "Mostrando pedidos pagados"
                        : "Mostrando pedidos no pagados",
                "info"
            );
        };
    });
    
    
    btnPrev.onclick = () => {
        if (paginaActual > 1) paginaActual--;
        renderPedidos();
    };

    btnNext.onclick = () => {
        paginaActual++;
        renderPedidos();
    };

    cerrarHistorial.onclick = () => modalHistorial.style.display = "none";

    window.onclick = e => {
        if (e.target === modalHistorial) modalHistorial.style.display = "none";
    };

    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        sessionStorage.removeItem("auth");
    window.location.href = "admin/login.html";
});
    }
    if (primeraCarga) {
        contenedor.innerHTML = "<p>Cargando pedidos...</p>";
    }
    let ultimoConteoMensajes = 0;

setInterval(() => {
    fetch("http://localhost:8080/api/mensajes/no-leidos/count", {
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
    })
    .then(count => {
        const badge = document.getElementById("badgeMensajes");

        if (!badge) return;

        // 🔔 SONIDO SOLO SI AUMENTA
        if (count > ultimoConteoMensajes) {
            sonido.play().catch(() => {});
            mostrarToast("📩 Nuevo mensaje recibido", "success");
        }

        ultimoConteoMensajes = count;

        // 🎯 UI
        if (count > 0) {
            badge.textContent = `(${count})`;
            badge.classList.add("activo");
        } else {
            badge.textContent = "";
            badge.classList.remove("activo");
        }
    })
    .catch(() => {
        console.warn("Error obteniendo mensajes");
    });

}, 10000); // cada 10s 🔥

filtrosMetodo.forEach(btn => {
    btn.onclick = () => {

        filtrosMetodo.forEach(b => b.classList.remove("activo"));
        btn.classList.add("activo");

        filtroMetodoPago = btn.dataset.metodo; // ✅ CORRECTO
        paginaActual = 1;

        renderPedidos();

        mostrarToast(
            filtroMetodoPago === "TODOS"
                ? "Mostrando todos los métodos de pago"
                : `Filtrando por ${filtroMetodoPago}`,
            "info"
        );
    };
});

function calcularTotalPagado(pedidos) {

    const total = pedidos
        .filter(p => p.estadoPago === "PAGADO")
        .reduce((sum, p) => sum + (p.total || 0), 0);

    document.getElementById("totalPagado").textContent =
        "$" + total.toLocaleString("es-CO");
}
function cargarStats() {

    fetch("http://localhost:8080/api/pedidos/stats", {
        headers: getAuthHeaders()
    })
    .then(res => res.json())
    .then(stats => {

        animarContador("statTotal", stats.total);
        animarContador("statPendientes", stats.pendientes);
        animarContador("statEnviados", stats.enviados);
        animarContador("statEntregados", stats.entregados);
        animarContador("statVentas", stats.totalVentas, true);
        animarContador("statPromedio", stats.promedio, true);

        document.getElementById("totalPagado").textContent =
            "$" + stats.totalPagado.toLocaleString("es-CO");

        const clienteEl = document.getElementById("statClienteTop");
        clienteEl.textContent = stats.clienteTop;

    })
    .catch(() => {
        mostrarToast("Error cargando estadísticas", "error");
    });
}

// 🔄 Auto actualizar pedidos cada 10 segundos
setInterval(() => {
    cargarPedidos();
}, 10000);
    /* 🚀 INICIO */
    cargarPedidos();
});

