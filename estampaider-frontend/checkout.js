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
  
    const div = document.createElement("div");
    div.classList.add("item");
    div.textContent =
      `${textoSeguro(item.nombre)} — ${cantidad} x $${precio.toLocaleString("es-CO")} = $${subtotal.toLocaleString("es-CO")}`;
  
    return { elemento: div, subtotal };
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
  
    const tipo = (metodo.tipo || "").toUpperCase();
    if (tipo === "TRANSFERENCIA" && metodo.dato) {
      const p = document.createElement("p");
      p.textContent = `Número: ${metodo.dato}`;
      info.appendChild(p);
    } else if (tipo === "PRESENCIAL" && metodo.dato) {
      const p = document.createElement("p");
      p.textContent = `Dirección: ${metodo.dato}`;
      info.appendChild(p);
    }
  
    input.addEventListener("change", () => onSelect(wrapper, metodo));
  
    label.append(input, nombre);
    wrapper.append(label, descripcion, info);
  
    return wrapper;
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const authCheckout = JSON.parse(sessionStorage.getItem("auth"));
  
    if (!authCheckout || !authCheckout.token) {
      sessionStorage.setItem("redirectAfterLogin", "checkout.html");
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
  
        metodos.forEach((m) => {
          const card = crearMetodoPagoCard(m, (cardActual, metodo) => {
            metodoPagoSeleccionado = metodo.nombre;
  
            document.querySelectorAll(".info-pago").forEach((i) => {
              i.style.display = "none";
            });
  
            cardActual.querySelector(".info-pago").style.display = "block";
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
          producto: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: Number(item.precio) || 0
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
