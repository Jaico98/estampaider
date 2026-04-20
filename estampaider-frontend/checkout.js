// ============================================================
// checkout.js — Estampaider
// Gestiona el formulario de confirmación de compra
// ============================================================

function resolverApiBase() {
  const configurada = window.API_BASE_URL || window.__API_BASE__;
  if (configurada) {
    return String(configurada).replace(/\/$/, "");
  }

  const { protocol, hostname, port, host } = window.location;

  if (protocol === "file:") {
    return "http://localhost:8080";
  }

  const esLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (esLocal && port && port !== "8080") {
    return `${protocol}//${hostname}:8080`;
  }

  return `${protocol}//${host}`;
}

const API_BASE = resolverApiBase();

function textoSeguro(valor) {
  return String(valor ?? "");
}

function crearLineaResumen(item) {
  const precio = Number(item.precio) || 0;
  const cantidad = Number(item.cantidad) || 0;
  const subtotal = precio * cantidad;

  const talla = textoSeguro(item.tallaSeleccionada).trim();
  const color = textoSeguro(item.colorSeleccionado).trim();

  const div = document.createElement("div");
  div.classList.add("item");

  const nombre = document.createElement("strong");
  nombre.textContent = textoSeguro(item.nombre);

  div.appendChild(nombre);

  if (talla) {
    const tallaEl = document.createElement("div");
    tallaEl.textContent = `Talla: ${talla}`;
    div.appendChild(tallaEl);
  }

  if (color) {
    const colorEl = document.createElement("div");
    colorEl.textContent = `Color: ${color}`;
    div.appendChild(colorEl);
  }

  const detalle = document.createElement("div");
  detalle.textContent =
    `Cantidad: ${cantidad} x $${precio.toLocaleString("es-CO")} = $${subtotal.toLocaleString("es-CO")}`;

  div.appendChild(detalle);

  return { elemento: div, subtotal };
}

function esRutaAbsoluta(valor) {
  return /^https?:\/\//i.test(valor);
}

function esBase64(valor) {
  return /^data:image\//i.test(valor);
}

function resolverSrcMetodoPago(dato) {
  const valor = textoSeguro(dato).trim();
  if (!valor) return "";

  if (esBase64(valor) || esRutaAbsoluta(valor)) {
    return valor;
  }

  if (valor.startsWith("/")) {
    return `${API_BASE}${valor}`;
  }

  return `${API_BASE}/${valor.replace(/^\.?\//, "")}`;
}

function crearBloqueQr(metodo) {
  const contenedor = document.createElement("div");
  contenedor.className = "qr-pago";

  const dato = textoSeguro(metodo.dato).trim();
  const src = resolverSrcMetodoPago(dato);

  if (!src) {
    const aviso = document.createElement("p");
    aviso.textContent = "Este método QR no tiene imagen configurada.";
    aviso.style.color = "#b91c1c";
    aviso.style.fontWeight = "700";
    contenedor.appendChild(aviso);
    return contenedor;
  }

  const texto = document.createElement("p");
  texto.textContent = "Escanea este código QR para realizar el pago:";
  texto.style.marginBottom = "10px";
  texto.style.fontWeight = "700";

  const imagen = document.createElement("img");
  imagen.src = src;
  imagen.alt = `Código QR de ${textoSeguro(metodo.nombre || "pago")}`;
  imagen.loading = "lazy";
  imagen.style.width = "100%";
  imagen.style.maxWidth = "240px";
  imagen.style.display = "block";
  imagen.style.borderRadius = "16px";
  imagen.style.border = "1px solid #dbe7f0";
  imagen.style.boxShadow = "0 10px 24px rgba(15,23,42,.08)";
  imagen.style.background = "#fff";
  imagen.style.padding = "8px";
  imagen.style.margin = "8px 0 12px";

  imagen.addEventListener("error", () => {
    contenedor.innerHTML = "";
    const error = document.createElement("p");
    error.textContent = "No se pudo cargar la imagen del QR.";
    error.style.color = "#b91c1c";
    error.style.fontWeight = "700";
    contenedor.appendChild(error);

    if (dato) {
      const ruta = document.createElement("p");
      ruta.textContent = `Ruta configurada: ${dato}`;
      ruta.style.fontSize = "13px";
      ruta.style.color = "#64748b";
      contenedor.appendChild(ruta);
    }
  });

  const abrir = document.createElement("a");
  abrir.href = src;
  abrir.target = "_blank";
  abrir.rel = "noopener noreferrer";
  abrir.textContent = "Abrir QR en otra pestaña";
  abrir.style.display = "inline-flex";
  abrir.style.alignItems = "center";
  abrir.style.gap = "8px";
  abrir.style.padding = "10px 14px";
  abrir.style.borderRadius = "12px";
  abrir.style.background = "#eff6ff";
  abrir.style.color = "#1d4ed8";
  abrir.style.fontWeight = "700";
  abrir.style.textDecoration = "none";

  contenedor.append(texto, imagen, abrir);
  return contenedor;
}

function crearMetodoPagoCard(metodo, onSelect) {
  const wrapper = document.createElement("div");
  wrapper.className = "metodo-pago";

  const label = document.createElement("label");
  label.className = "metodo-pago-label";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = "metodoPago";
  input.value = metodo.nombre || "";

  const nombre = document.createElement("strong");
  nombre.textContent = metodo.nombre || "Método de pago";

  const descripcion = document.createElement("p");
  descripcion.textContent = metodo.descripcion || "";

  const info = document.createElement("div");
  info.className = "info-pago";
  info.style.display = "none";
  info.style.marginTop = "12px";
  info.style.padding = "14px";
  info.style.borderRadius = "16px";
  info.style.background = "#f8fbff";
  info.style.border = "1px solid #dbe7f0";

  const tipo = textoSeguro(metodo.tipo).trim().toUpperCase();
  const nombreMetodo = textoSeguro(metodo.nombre).trim().toUpperCase();

  if (tipo === "TRANSFERENCIA" && metodo.dato) {
    const p = document.createElement("p");
    p.textContent = `Número: ${metodo.dato}`;
    p.style.margin = "0";
    p.style.fontWeight = "700";
    info.appendChild(p);
  } else if (tipo === "PRESENCIAL" && metodo.dato) {
    const p = document.createElement("p");
    p.textContent = `Dirección: ${metodo.dato}`;
    p.style.margin = "0";
    p.style.fontWeight = "700";
    info.appendChild(p);
  } else if (tipo === "QR" || nombreMetodo.includes("QR")) {
    info.appendChild(crearBloqueQr(metodo));
  }

  input.addEventListener("change", () => onSelect(wrapper, metodo));

  label.append(input, nombre);
  wrapper.append(label, descripcion, info);

  return wrapper;
}

document.addEventListener("DOMContentLoaded", () => {
  const authCheckout = JSON.parse(sessionStorage.getItem("auth") || "null");

  if (!authCheckout || !authCheckout.token) {
    sessionStorage.setItem("redirectAfterLogin", "/checkout.html");
    window.location.href = "admin/login.html";
    return;
  }

  const campoCliente = document.getElementById("cliente");
  const campoTelefono = document.getElementById("telefono");
  const resumen = document.getElementById("resumen");
  const totalSpan = document.getElementById("total");
  const btnConfirmar = document.getElementById("confirmar");
  const contMetodos = document.getElementById("metodosPago");

  if (campoCliente && authCheckout.nombre) {
    campoCliente.value = authCheckout.nombre;
  }

  if (campoTelefono && authCheckout.telefono) {
    campoTelefono.value = authCheckout.telefono;
  }

  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  if (!Array.isArray(carrito) || carrito.length === 0) {
    alert("El carrito está vacío");
    window.location.href = "carrito.html";
    return;
  }

  let total = 0;
  resumen.innerHTML = "";

  carrito.forEach((item) => {
    const { elemento, subtotal } = crearLineaResumen(item);
    total += subtotal;
    resumen.appendChild(elemento);
  });

  totalSpan.textContent = total.toLocaleString("es-CO");

  let metodoPagoSeleccionado = null;
  let enviando = false;

  fetch(`${API_BASE}/api/metodos-pago`, {
    headers: { Accept: "application/json" }
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("No se pudieron cargar los métodos de pago");
      }
      return res.json();
    })
    .then((metodos) => {
      contMetodos.innerHTML = "";

      if (!Array.isArray(metodos) || !metodos.length) {
        contMetodos.textContent =
          "No hay métodos de pago disponibles en este momento.";
        return;
      }

      metodos.forEach((m) => {
        const card = crearMetodoPagoCard(m, (cardActual, metodo) => {
          metodoPagoSeleccionado = metodo.nombre;

          document.querySelectorAll(".info-pago").forEach((i) => {
            i.style.display = "none";
          });

          const info = cardActual.querySelector(".info-pago");
          if (info) {
            info.style.display = "block";
          }
        });

        contMetodos.appendChild(card);
      });
    })
    .catch((error) => {
      console.error("Error métodos de pago:", error);
      if (contMetodos) {
        contMetodos.textContent =
          "No se pudieron cargar los métodos de pago. Contáctanos por WhatsApp.";
      }
    });

  btnConfirmar.addEventListener("click", () => {
    if (enviando) return;

    const cliente = document.getElementById("cliente")?.value.trim() || "";
    const telefono = document.getElementById("telefono")?.value.trim() || "";
    const telefonoLimpio = telefono.replace(/\D/g, "");

    if (!cliente || telefonoLimpio.length < 10) {
      alert("Ingresa un nombre y un número de WhatsApp válido (mínimo 10 dígitos).");
      return;
    }

    const direccion = document.getElementById("direccion")?.value.trim() || "";
    const ciudad = document.getElementById("ciudad")?.value.trim() || "";
    const departamento = document.getElementById("departamento")?.value.trim() || "";
    const barrio = document.getElementById("barrio")?.value.trim() || "";
    const referencia = document.getElementById("referencia")?.value.trim() || "";

    if (!direccion || !ciudad || !departamento) {
      alert("Completa los datos de envío obligatorios: dirección, ciudad y departamento.");
      return;
    }

    if (!metodoPagoSeleccionado) {
      alert("Selecciona un método de pago.");
      return;
    }

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
      detalles: carrito.map((item) => ({
        producto: textoSeguro(item.nombre).trim(),
        cantidad: Number(item.cantidad) || 0,
        precioUnitario: Number(item.precio) || 0,
        talla: textoSeguro(item.tallaSeleccionada).trim(),
        color: textoSeguro(item.colorSeleccionado).trim()
      }))
    };

    fetch(`${API_BASE}/api/pedidos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authCheckout.token}`
      },
      body: JSON.stringify(pedido)
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al registrar el pedido");
        }
        return res.json();
      })
      .then((pedidoGuardado) => {
        localStorage.setItem("pedidoId", pedidoGuardado.id);
        localStorage.removeItem("carrito");
        window.location.href = "gracias.html";
      })
      .catch((error) => {
        console.error("Error pedido:", error);
        enviando = false;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar compra";
        alert("❌ No se pudo registrar el pedido. Intenta de nuevo o contáctanos por WhatsApp.");
      });
  });
});