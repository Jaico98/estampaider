document.addEventListener("DOMContentLoaded", () => {
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");
  if (!auth || auth.rol?.trim() !== "ADMIN" || !auth.token) {
    sessionStorage.setItem("redirectAfterLogin", "/pedidos.html");
    window.location.href = "admin/login.html";
    return;
  }

  const API_BASE =
    window.ESTAMPAIDER_CONFIG?.API_BASE ||
    (typeof resolverApiBase === "function" ? resolverApiBase() : "http://localhost:8080");

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
  const btnResetFiltros = document.getElementById("resetFiltros");
  const modalHistorial = document.getElementById("modalHistorial");
  const tablaHistorial = document.getElementById("tablaHistorial");
  const clienteHistorial = document.getElementById("clienteHistorial");
  const cerrarHistorial = document.getElementById("cerrarHistorial");
  const sonido = new Audio("notification.mp3");

  let chartEstados = null;
  let chartVentas = null;
  let filtroFechaVenta = null;
  let ultimoTotalPedidos = 0;
  let pedidosVistos = new Set();
  let pedidosNuevos = new Set();

  let pedidosGlobal = [];
  let primeraCarga = true;
  let estadoActual = "TODOS";
  let textoBusqueda = "";
  let ordenFecha = "DESC";
  let filtroPago = "TODOS";
  let filtroMetodoPago = "TODOS";
  let paginaActual = 1;
  const pedidosPorPagina = 5;

  function getAuthHeaders() {
    const authActual = JSON.parse(sessionStorage.getItem("auth") || "null");
    if (!authActual || !authActual.token) {
      window.location.href = "admin/login.html";
      throw new Error("Sesión no válida");
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authActual.token}`,
    };
  }

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  function mostrarToast(mensaje, tipo = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = mensaje;
    toast.className = "";
    toast.classList.add("show", `toast-${tipo}`);
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function animarContador(id, valorFinal, esDinero = false) {
    const el = document.getElementById(id);
    if (!el) return;

    const finalSeguro = Number(valorFinal) || 0;
    let valor = 0;
    const incremento = Math.max(1, Math.ceil(finalSeguro / 30));

    const intervalo = setInterval(() => {
      valor += incremento;
      if (valor >= finalSeguro) {
        valor = finalSeguro;
        clearInterval(intervalo);
      }
      el.textContent = esDinero ? `$${valor.toLocaleString("es-CO")}` : valor;
    }, 20);
  }

  function normalizarTelefono(valor) {
    const limpio = String(valor ?? "").replace(/\D/g, "");
    if (!limpio) return "";
    return limpio.startsWith("57") ? limpio : `57${limpio}`;
  }

  function obtenerTipoCliente(telefono) {
    if (!telefono) return null;

    const pedidosCliente = pedidosGlobal.filter(
      (p) =>
        normalizarTelefono(p.telefono) === normalizarTelefono(telefono) &&
        p.estado === "ENTREGADO"
    );

    const totalGastado = pedidosCliente.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    if (totalGastado >= 200000) {
      return { texto: "Cliente VIP", clase: "vip" };
    }
    if (pedidosCliente.length >= 3) {
      return { texto: "Recurrente", clase: "recurrente" };
    }
    if (pedidosCliente.length >= 1) {
      return { texto: "Nuevo", clase: "nuevo" };
    }
    return null;
  }

  function generarMensajeWhatsApp(pedido) {
    const tipoCliente = obtenerTipoCliente(pedido.telefono);
    const fecha = pedido.fecha ? new Date(pedido.fecha).toLocaleDateString("es-CO") : "—";
    const productos = pedido.detalles?.length
      ? pedido.detalles
          .map((d) => `• ${textoSeguro(d.producto)} x ${Number(d.cantidad) || 0}`)
          .join("\n")
      : "• Sin productos";

    let saludo = `Hola *${textoSeguro(pedido.cliente || "Cliente")}*`;
    let extra = "";

    if (tipoCliente?.clase === "vip") {
      extra = "\n💛 *Gracias por ser uno de nuestros mejores clientes.*";
    } else if (tipoCliente?.clase === "recurrente") {
      extra = "\n✨ *Gracias por confiar nuevamente en Estampaider.*";
    } else if (tipoCliente?.clase === "nuevo") {
      extra = "\n🎉 *¡Bienvenido a Estampaider!* Gracias por tu primera compra.";
    }

    return (
      `${saludo}\n\n` +
      `Somos *Estampaider*\n` +
      `*Pedido #${pedido.id}*\n` +
      `Fecha: ${fecha}\n` +
      `Estado: *${textoSeguro(pedido.estado)}*\n` +
      `Método de pago: ${textoSeguro(pedido.metodoPago || "No especificado")}\n` +
      `Estado de pago: ${textoSeguro(pedido.estadoPago || "PENDIENTE")}\n` +
      `Total: *$${(Number(pedido.total) || 0).toLocaleString("es-CO")}*\n\n` +
      `Productos:\n${productos}\n${extra}\n\n` +
      `Envíanos el comprobante a este WhatsApp. Cualquier duda estamos atentos.`
    ).trim();
  }

  function actualizarDashboard(pedidos) {
    const total = pedidos.length;
    const pendientes = pedidos.filter(
      (p) => p.estado === "PENDIENTE" || p.estado === "RECIBIDO"
    ).length;
    const enviados = pedidos.filter((p) => p.estado === "ENVIADO").length;
    const entregadosPedidos = pedidos.filter((p) => p.estado === "ENTREGADO");
    const totalVentas = entregadosPedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    document.title = `(${pendientes}) Pedidos - Estampaider`;

    animarContador("statTotal", total);
    animarContador("statPendientes", pendientes);
    animarContador("statEnviados", enviados);
    animarContador("statEntregados", entregadosPedidos.length);
    animarContador("statVentas", totalVentas, true);

    const promedio = entregadosPedidos.length
      ? Math.round(totalVentas / entregadosPedidos.length)
      : 0;
    animarContador("statPromedio", promedio, true);

    const clientes = {};
    entregadosPedidos.forEach((p) => {
      if (!p.cliente) return;
      clientes[p.cliente] = (clientes[p.cliente] || 0) + (Number(p.total) || 0);
    });

    let clienteTop = "—";
    let maxCompra = 0;
    Object.entries(clientes).forEach(([cliente, valor]) => {
      if (valor > maxCompra) {
        maxCompra = valor;
        clienteTop = cliente;
      }
    });

    const clienteEl = document.getElementById("statClienteTop");
    if (clienteEl) {
      clienteEl.textContent =
        clienteTop !== "—" ? `${clienteTop} ($${maxCompra.toLocaleString("es-CO")})` : "—";
    }
  }

  function activarDashboardClicks() {
    const cardTotal = document.querySelector(".card:not(.pendiente):not(.enviado):not(.entregado):not(.dinero)");
    const cardPendiente = document.querySelector(".card.pendiente");
    const cardEnviado = document.querySelector(".card.enviado");
    const cardEntregado = document.querySelector(".card.entregado");
    const cardVentas = document.querySelector(".card.dinero");

    if (cardTotal) cardTotal.onclick = () => aplicarFiltroDashboard("TODOS");
    if (cardPendiente) cardPendiente.onclick = () => aplicarFiltroDashboard("PENDIENTE");
    if (cardEnviado) cardEnviado.onclick = () => aplicarFiltroDashboard("ENVIADO");
    if (cardEntregado) cardEntregado.onclick = () => aplicarFiltroDashboard("ENTREGADO");
    if (cardVentas) cardVentas.onclick = () => aplicarFiltroDashboard("ENTREGADO");
  }

  function aplicarFiltroDashboard(estado) {
    estadoActual = estado;
    paginaActual = 1;
    filtroFechaVenta = null;

    filtros.forEach((b) => b.classList.toggle("activo", b.dataset.estado === estado));
    renderPedidos();

    mostrarToast(
      estado === "TODOS"
        ? "Mostrando todos los pedidos"
        : `Filtrando pedidos ${estado.toLowerCase()}`,
      "info"
    );
  }

  function actualizarGraficas(pedidos) {
    const estados = { PENDIENTE: 0, ENVIADO: 0, ENTREGADO: 0 };

    const pedidosFiltrados = pedidos.filter((p) => {
      if (filtroMetodoPago === "TODOS") return true;
      return p.metodoPago === filtroMetodoPago;
    });

    pedidosFiltrados.forEach((p) => {
      const estado = p.estado === "RECIBIDO" ? "PENDIENTE" : p.estado;
      if (estados[estado] !== undefined) estados[estado]++;
    });

    if (chartEstados) chartEstados.destroy();
    if (window.Chart && document.getElementById("graficaEstados")) {
      chartEstados = new Chart(document.getElementById("graficaEstados"), {
        type: "doughnut",
        data: {
          labels: ["Pendientes", "Enviados", "Entregados"],
          datasets: [
            {
              data: Object.values(estados),
              backgroundColor: ["#facc15", "#3b82f6", "#22c55e"],
            },
          ],
        },
        options: { responsive: true },
      });
    }

    const ventasPorFecha = {};
    pedidos
      .filter((p) => p.estado === "ENTREGADO")
      .forEach((p) => {
        const fecha = p.fecha?.split("T")[0] || "Sin fecha";
        ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + (Number(p.total) || 0);
      });

    const fechas = Object.keys(ventasPorFecha);
    const totales = Object.values(ventasPorFecha);

    if (chartVentas) chartVentas.destroy();
    if (window.Chart && document.getElementById("graficaVentas")) {
      chartVentas = new Chart(document.getElementById("graficaVentas"), {
        type: "bar",
        data: {
          labels: fechas,
          datasets: [{ label: "Ventas ($)", data: totales, backgroundColor: "#22c55e" }],
        },
        options: {
          responsive: true,
          onClick: (_, elements) => {
            if (!elements.length) return;
            filtroFechaVenta = fechas[elements[0].index];
            estadoActual = "ENTREGADO";
            paginaActual = 1;
            filtros.forEach((b) =>
              b.classList.toggle("activo", b.dataset.estado === "ENTREGADO")
            );
            renderPedidos();
          },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
  }

  function calcularTotalPagado(pedidos) {
    const totalPagado = pedidos
      .filter((p) => p.estadoPago === "PAGADO")
      .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    const el = document.getElementById("totalPagado");
    if (el) el.textContent = `$${totalPagado.toLocaleString("es-CO")}`;
  }

  function crearFilaHistorial(pedido) {
    const fila = document.createElement("tr");

    const c1 = document.createElement("td");
    c1.textContent = `#${pedido.id}`;

    const c2 = document.createElement("td");
    c2.textContent = pedido.fecha ? new Date(pedido.fecha).toLocaleDateString("es-CO") : "—";

    const c3 = document.createElement("td");
    c3.textContent = textoSeguro(pedido.estado);

    const c4 = document.createElement("td");
    c4.textContent = `$${(Number(pedido.total) || 0).toLocaleString("es-CO")}`;

    fila.append(c1, c2, c3, c4);
    return fila;
  }

  function verHistorial(telefono, nombreCliente) {
    if (!telefono) {
      mostrarToast("Este cliente no tiene teléfono", "error");
      return;
    }

    const pedidosCliente = pedidosGlobal.filter(
      (p) => normalizarTelefono(p.telefono) === normalizarTelefono(telefono)
    );

    if (!pedidosCliente.length) {
      mostrarToast("Este cliente no tiene historial", "info");
      return;
    }

    if (!tablaHistorial || !clienteHistorial || !modalHistorial) return;

    tablaHistorial.innerHTML = "";

    let totalGastado = 0;
    let entregados = 0;

    pedidosCliente.forEach((p) => {
      totalGastado += Number(p.total) || 0;
      if (p.estado === "ENTREGADO") entregados++;
      tablaHistorial.appendChild(crearFilaHistorial(p));
    });

    const promedio = entregados ? Math.round(totalGastado / entregados) : 0;
    let tipoCliente = "Cliente nuevo";
    if (entregados >= 3) tipoCliente = "Cliente recurrente";
    if (totalGastado >= 200000) tipoCliente = "Cliente VIP";

    clienteHistorial.innerHTML = "";
    const bloques = [
      textoSeguro(nombreCliente || "Cliente"),
      textoSeguro(telefono),
      `Pedidos totales: ${pedidosCliente.length}`,
      `Entregados: ${entregados}`,
      `Total gastado: $${totalGastado.toLocaleString("es-CO")}`,
      `Ticket promedio: $${promedio.toLocaleString("es-CO")}`,
      `Tipo: ${tipoCliente}`,
    ];

    bloques.forEach((texto) => {
      const p = document.createElement("p");
      p.textContent = texto;
      clienteHistorial.appendChild(p);
    });

    modalHistorial.style.display = "block";
  }

  function crearBoton(texto, clase, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = clase;
    btn.textContent = texto;
    btn.onclick = onClick;
    return btn;
  }

  function crearBadge(texto, clase) {
    const span = document.createElement("span");
    span.className = clase;
    span.textContent = texto;
    return span;
  }

  function crearPedidoCard(pedido) {
    const div = document.createElement("div");
    const tipoCliente = obtenerTipoCliente(pedido.telefono);

    const clases = ["pedido-card", `estado-${pedido.estado}`];
    if (tipoCliente) clases.push(`cliente-${tipoCliente.clase}`);
    if (pedidosNuevos.has(pedido.id)) clases.push("nuevo-pedido");
    if (!pedido.visto) clases.push("no-leido");
    div.className = clases.join(" ");

    const header = document.createElement("div");
    header.className = "pedido-header";

    header.appendChild(crearBadge(textoSeguro(pedido.estado), "badge-estado"));

    if (pedido.estadoPago) {
      header.appendChild(crearBadge(textoSeguro(pedido.estadoPago), "badge-pago"));
    }

    if (tipoCliente) {
      header.appendChild(crearBadge(tipoCliente.texto, `badge-cliente ${tipoCliente.clase}`));
    }

    const titulo = document.createElement("h3");
    titulo.textContent = `Pedido #${pedido.id}`;

    const fecha = document.createElement("p");
    fecha.textContent = `Fecha: ${
      pedido.fecha ? new Date(pedido.fecha).toLocaleString("es-CO") : "—"
    }`;

    const lista = document.createElement("ul");
    lista.className = "pedido-detalles";
    if (pedido.detalles?.length) {
      pedido.detalles.forEach((d) => {
        const li = document.createElement("li");
        li.textContent = `${textoSeguro(d.producto)} x ${Number(d.cantidad) || 0} — $${(
          (Number(d.precioUnitario) || 0) * (Number(d.cantidad) || 0)
        ).toLocaleString("es-CO")}`;
        lista.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "Sin productos";
      lista.appendChild(li);
    }

    const total = document.createElement("p");
    total.textContent = `Total: $${(Number(pedido.total) || 0).toLocaleString("es-CO")}`;

    const metodo = document.createElement("p");
    metodo.textContent = `Método de pago: ${textoSeguro(pedido.metodoPago || "No definido")}`;

    const pago = document.createElement("p");
    pago.textContent = `Estado de pago: ${
      pedido.estadoPago === "PAGADO" ? "PAGADO" : "PENDIENTE"
    }`;

    const acciones = document.createElement("div");
    acciones.className = "pedido-acciones";

    const btnWhatsApp = crearBoton("WhatsApp", "whatsapp", () => {
      if (!pedido.telefono) {
        mostrarToast("Este pedido no tiene teléfono", "error");
        return;
      }

      const telefono = normalizarTelefono(pedido.telefono);
      const mensaje = generarMensajeWhatsApp(pedido);
      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
    });

    const btnHistorial = crearBoton("Historial", "btn-historial", () => {
      verHistorial(pedido.telefono, pedido.cliente);
    });

    const btnEnviar = crearBoton("Enviar", "estado", () => actualizarEstado(pedido.id, "ENVIADO"));
    btnEnviar.dataset.estado = "ENVIADO";
    if (pedido.estado === "ENTREGADO" || pedido.estado === "ENVIADO") btnEnviar.disabled = true;

    const btnEntregado = crearBoton("Entregado", "estado", () =>
      actualizarEstado(pedido.id, "ENTREGADO")
    );
    btnEntregado.dataset.estado = "ENTREGADO";
    if (pedido.estado === "ENTREGADO") btnEntregado.disabled = true;

    acciones.append(btnWhatsApp, btnHistorial, btnEnviar, btnEntregado);

    if (pedido.estadoPago !== "PAGADO") {
      acciones.appendChild(crearBoton("Marcar pagado", "pagar", () => marcarPagado(pedido.id)));
    }

    acciones.appendChild(crearBoton("Eliminar", "eliminar", () => eliminarPedido(pedido.id)));

    div.append(header, titulo, fecha, lista, total, metodo, pago, acciones);
    return div;
  }

  function actualizarEstado(id, nuevoEstado) {
    fetch(`${API_BASE}/api/pedidos/${id}/estado?estado=${encodeURIComponent(nuevoEstado)}`, {
      method: "PUT",
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.text();
      })
      .then(() => {
        mostrarToast(
          nuevoEstado === "ENTREGADO"
            ? "Pedido marcado como ENTREGADO"
            : "Pedido marcado como ENVIADO",
          "success"
        );
        setTimeout(cargarPedidos, 400);
      })
      .catch(() => mostrarToast("Error al actualizar el pedido", "error"));
  }

  function marcarPagado(id) {
    if (!confirm(`¿Marcar el pedido #${id} como PAGADO?`)) return;

    fetch(`${API_BASE}/api/pedidos/${id}/pago`, {
      method: "PUT",
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        mostrarToast("Pago marcado como PAGADO", "success");
        cargarPedidos();
      })
      .catch(() => mostrarToast("Error al marcar el pago", "error"));
  }

  function eliminarPedido(id) {
    if (!confirm(`¿Eliminar pedido #${id}?`)) return;

    fetch(`${API_BASE}/api/pedidos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        cargarPedidos();
      })
      .catch(() => mostrarToast("Error al eliminar", "error"));
  }

  function renderPedidos() {
    if (!contenedor) return;

    contenedor.innerHTML = "";
    let pedidosFiltrados = [...pedidosGlobal];

    if (estadoActual !== "TODOS") {
      if (estadoActual === "PENDIENTE") {
        pedidosFiltrados = pedidosFiltrados.filter(
          (p) => p.estado === "PENDIENTE" || p.estado === "RECIBIDO"
        );
      } else {
        pedidosFiltrados = pedidosFiltrados.filter((p) => p.estado === estadoActual);
      }
    }

    if (filtroPago === "PAGADO") {
      pedidosFiltrados = pedidosFiltrados.filter((p) => p.estadoPago === "PAGADO");
    } else if (filtroPago === "NO_PAGADO") {
      pedidosFiltrados = pedidosFiltrados.filter((p) => !p.estadoPago || p.estadoPago !== "PAGADO");
    }

    if (filtroMetodoPago !== "TODOS") {
      pedidosFiltrados = pedidosFiltrados.filter((p) => p.metodoPago === filtroMetodoPago);
    }

    if (filtroFechaVenta) {
      pedidosFiltrados = pedidosFiltrados.filter((p) => p.fecha && p.fecha.startsWith(filtroFechaVenta));
    }

    if (textoBusqueda.trim()) {
      const t = textoBusqueda.toLowerCase();
      pedidosFiltrados = pedidosFiltrados.filter(
        (p) =>
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
      contenedor.textContent = "No hay pedidos.";
      if (infoPagina) infoPagina.textContent = "";
      return;
    }

    const totalPaginas = Math.ceil(pedidosFiltrados.length / pedidosPorPagina);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * pedidosPorPagina;
    const pedidosPagina = pedidosFiltrados.slice(inicio, inicio + pedidosPorPagina);

    const fragment = document.createDocumentFragment();
    pedidosPagina.forEach((pedido) => fragment.appendChild(crearPedidoCard(pedido)));
    contenedor.appendChild(fragment);

    if (infoPagina) infoPagina.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    if (btnPrev) btnPrev.disabled = paginaActual === 1;
    if (btnNext) btnNext.disabled = paginaActual === totalPaginas;
  }

  function cargarStats() {
    fetch(`${API_BASE}/api/pedidos/stats`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((stats) => {
        if (!stats) return;
        const el = document.getElementById("statBackendTotal");
        if (el) el.textContent = stats.total ?? "";
      })
      .catch(() => {});
  }

  function cargarPedidos() {
    fetch(`${API_BASE}/api/pedidos`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar pedidos");
        return res.json();
      })
      .then((pedidos) => {
        pedidos.forEach((p) => {
          if (!pedidosVistos.has(p.id)) pedidosNuevos.add(p.id);
        });

        if (pedidos.length > ultimoTotalPedidos && ultimoTotalPedidos !== 0) {
          sonido.play().catch(() => {});
          mostrarToast("Nuevo pedido recibido", "success");
        }

        if (pedidos.length === ultimoTotalPedidos && !primeraCarga) {
          return;
        }

        ultimoTotalPedidos = pedidos.length;
        pedidosGlobal = pedidos;
        pedidos.forEach((p) => pedidosVistos.add(p.id));

        actualizarDashboard(pedidos);
        cargarStats();
        actualizarGraficas(pedidos);
        calcularTotalPagado(pedidos);
        renderPedidos();
        primeraCarga = false;
        activarDashboardClicks();
      })
      .catch(() => {
        if (contenedor) contenedor.textContent = "Error al cargar pedidos";
        mostrarToast("Error al cargar pedidos", "error");
      });
  }

  function exportarExcel() {
    if (!pedidosGlobal.length) {
      mostrarToast("No hay pedidos para exportar", "error");
      return;
    }

    if (!window.XLSX) {
      mostrarToast("La librería Excel no está disponible", "error");
      return;
    }

    const datos = pedidosGlobal.map((p) => ({
      ID: p.id,
      Cliente: p.cliente || "—",
      Teléfono: p.telefono || "—",
      Fecha: p.fecha ? new Date(p.fecha).toLocaleDateString("es-CO") : "—",
      Estado: p.estado,
      Total: p.total || 0,
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedidos");
    XLSX.writeFile(libro, "pedidos_estampaider.xlsx");
    mostrarToast("Excel exportado correctamente", "success");
  }

  function exportarPDF() {
    if (!pedidosGlobal.length) {
      mostrarToast("No hay pedidos para exportar", "error");
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      mostrarToast("La librería PDF no está disponible", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Reporte de Pedidos - Estampaider", 14, 15);

    const filas = pedidosGlobal.map((p) => [
      p.id,
      p.cliente || "—",
      p.telefono || "—",
      p.fecha ? new Date(p.fecha).toLocaleDateString("es-CO") : "—",
      p.estado,
      `$${(p.total || 0).toLocaleString("es-CO")}`,
    ]);

    doc.autoTable({
      head: [["ID", "Cliente", "Teléfono", "Fecha", "Estado", "Total"]],
      body: filas,
      startY: 20,
    });

    doc.save("pedidos_estampaider.pdf");
    mostrarToast("PDF exportado correctamente", "success");
  }

  filtros.forEach((btn) => {
    btn.onclick = () => {
      filtros.forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      estadoActual = btn.dataset.estado;
      paginaActual = 1;
      renderPedidos();
    };
  });

  filtrosPago.forEach((btn) => {
    btn.onclick = () => {
      filtrosPago.forEach((b) => b.classList.remove("activo"));
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

  filtrosMetodo.forEach((btn) => {
    btn.onclick = () => {
      filtrosMetodo.forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      filtroMetodoPago = btn.dataset.metodo;
      paginaActual = 1;
      renderPedidos();
      actualizarGraficas(pedidosGlobal);
    };
  });

  if (btnExcel) btnExcel.onclick = exportarExcel;
  if (btnPDF) btnPDF.onclick = exportarPDF;

  if (buscador) {
    buscador.oninput = () => {
      textoBusqueda = buscador.value;
      paginaActual = 1;
      renderPedidos();
    };
  }

  if (btnOrdenFecha) {
    btnOrdenFecha.onclick = () => {
      ordenFecha = ordenFecha === "DESC" ? "ASC" : "DESC";
      paginaActual = 1;
      filtroFechaVenta = null;
      btnOrdenFecha.textContent =
        ordenFecha === "DESC"
          ? "Fecha ↓ (Recientes primero)"
          : "Fecha ↑ (Antiguos primero)";
      renderPedidos();
    };
  }

  if (btnPrev) {
    btnPrev.onclick = () => {
      if (paginaActual > 1) paginaActual--;
      renderPedidos();
    };
  }

  if (btnNext) {
    btnNext.onclick = () => {
      paginaActual++;
      renderPedidos();
    };
  }

  if (btnResetFiltros) {
    btnResetFiltros.onclick = () => {
      estadoActual = "TODOS";
      textoBusqueda = "";
      filtroFechaVenta = null;
      ordenFecha = "DESC";
      paginaActual = 1;
      filtroPago = "TODOS";
      filtroMetodoPago = "TODOS";

      if (buscador) buscador.value = "";
      if (btnOrdenFecha) btnOrdenFecha.textContent = "Fecha ↓ (Recientes primero)";

      filtros.forEach((b) => {
        b.classList.remove("activo");
        if (b.dataset.estado === "TODOS") b.classList.add("activo");
      });

      filtrosPago.forEach((b) => {
        b.classList.remove("activo");
        if (b.dataset.pago === "TODOS") b.classList.add("activo");
      });

      filtrosMetodo.forEach((b) => {
        b.classList.remove("activo");
        if (b.dataset.metodo === "TODOS") b.classList.add("activo");
      });

      renderPedidos();
      actualizarDashboard(pedidosGlobal);
      actualizarGraficas(pedidosGlobal);
      mostrarToast("Filtros reiniciados correctamente", "info");
    };
  }

  if (cerrarHistorial) {
    cerrarHistorial.onclick = () => {
      if (modalHistorial) modalHistorial.style.display = "none";
    };
  }

  window.addEventListener("click", (e) => {
    if (e.target === modalHistorial && modalHistorial) {
      modalHistorial.style.display = "none";
    }
  });

  const btnLogout = document.getElementById("logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      sessionStorage.removeItem("auth");
      window.location.href = "admin/login.html";
    });
  }

  if (primeraCarga && contenedor) {
    contenedor.textContent = "Cargando pedidos...";
  }

  cargarPedidos();
  setInterval(cargarPedidos, 15000);
});

  