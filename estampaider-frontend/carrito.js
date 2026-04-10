document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("carrito");
  const totalSpan = document.getElementById("total");
  const btnWhatsapp = document.getElementById("whatsappCarrito");
  const btnVaciarCarrito = document.getElementById("btnVaciarCarrito");

  if (!contenedor || !totalSpan || !btnWhatsapp) return;

  function obtenerCarrito() {
    try {
      const data = JSON.parse(localStorage.getItem("carrito"));
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error leyendo carrito desde localStorage:", error);
      return [];
    }
  }

  let carrito = obtenerCarrito();

  function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    if (typeof actualizarContadorCarrito === "function") {
      actualizarContadorCarrito();
    }
  }

  function construirMensajeWhatsapp(total) {
    let mensaje = "Hola Estampaider, quiero cotizar estos productos:%0A%0A";

    carrito.forEach((item) => {
      const precio = Number(item.precio) || 0;
      const cantidad = Number(item.cantidad) || 1;
      const subtotal = precio * cantidad;
      mensaje += `• ${item.nombre} x${cantidad} = $${subtotal.toLocaleString("es-CO")}%0A`;
    });

    mensaje += `%0ATotal: $${total.toLocaleString("es-CO")}`;
    return mensaje;
  }

  function actualizarBotonesEstadoVacio() {
    if (!btnVaciarCarrito) return;
    btnVaciarCarrito.style.display = carrito.length === 0 ? "none" : "inline-flex";
  }

  function renderizarCarrito() {
    carrito = obtenerCarrito();
    contenedor.innerHTML = "";

    if (carrito.length === 0) {
      contenedor.innerHTML = `
        <div class="empty-state">
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos desde el catálogo para continuar con tu compra.</p>
          <div class="actions">
            <a class="btn btn-primary" href="productos.html">Ir a productos</a>
          </div>
        </div>
      `;

      totalSpan.textContent = "0";
      btnWhatsapp.style.display = "none";
      actualizarBotonesEstadoVacio();
      return;
    }

    let total = 0;

    carrito.forEach((item, index) => {
      const precio = Number(item.precio) || 0;
      const cantidad = Number(item.cantidad) || 1;
      const subtotal = precio * cantidad;
      total += subtotal;

      const div = document.createElement("article");
      div.className = "cart-item";
      div.innerHTML = `
        <div class="cart-item-head">
          <div>
            <h3>${item.nombre}</h3>
            <small>Precio unitario: $${precio.toLocaleString("es-CO")}</small>
          </div>
          <strong>$${subtotal.toLocaleString("es-CO")}</strong>
        </div>

        <div class="cart-controls">
          <label for="cantidad-${index}">Cantidad</label>
          <input
            id="cantidad-${index}"
            type="number"
            min="1"
            value="${cantidad}"
            data-index="${index}"
            class="cantidad-item"
          />
          <button type="button" class="btn btn-secondary eliminar" data-index="${index}">
            Eliminar
          </button>
        </div>
      `;

      contenedor.appendChild(div);
    });

    totalSpan.textContent = total.toLocaleString("es-CO");
    btnWhatsapp.href = `https://wa.me/573153625992?text=${construirMensajeWhatsapp(total)}`;
    btnWhatsapp.style.display = "inline-flex";
    actualizarBotonesEstadoVacio();
  }

  contenedor.addEventListener("input", (e) => {
    if (!e.target.classList.contains("cantidad-item")) return;

    const index = Number(e.target.dataset.index);
    const nuevaCantidad = Math.max(1, parseInt(e.target.value, 10) || 1);

    if (!carrito[index]) return;

    carrito[index].cantidad = nuevaCantidad;
    guardarCarrito();
    renderizarCarrito();
  });

  contenedor.addEventListener("click", (e) => {
    const botonEliminar = e.target.closest(".eliminar");
    if (!botonEliminar) return;

    const index = Number(botonEliminar.dataset.index);
    if (Number.isNaN(index) || !carrito[index]) return;

    carrito.splice(index, 1);
    guardarCarrito();
    renderizarCarrito();
  });

  if (btnVaciarCarrito) {
    btnVaciarCarrito.addEventListener("click", () => {
      const confirmar = window.confirm("¿Seguro que quieres vaciar todo el carrito?");
      if (!confirmar) return;

      carrito = [];
      guardarCarrito();
      renderizarCarrito();
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "carrito") {
      carrito = obtenerCarrito();
      renderizarCarrito();
    }
  });

  guardarCarrito();
  renderizarCarrito();
});
