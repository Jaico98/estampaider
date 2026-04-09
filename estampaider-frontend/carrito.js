document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("carrito");
  const totalSpan = document.getElementById("total");
  const itemsResumen = document.getElementById("itemsResumen");
  const btnWhatsapp = document.getElementById("whatsappCarrito");

  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  function guardar() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    if (typeof actualizarContadorCarrito === "function") actualizarContadorCarrito();
  }

  function renderizarCarrito() {
    contenedor.innerHTML = "";

    if (!Array.isArray(carrito) || carrito.length === 0) {
      contenedor.innerHTML = `
        <div class="empty-state">
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos desde el catálogo para continuar con tu compra.</p>
          <div class="actions"><a class="btn btn-primary" href="productos.html">Ir a productos</a></div>
        </div>`;
      totalSpan.textContent = "0";
      itemsResumen.textContent = "0";
      btnWhatsapp.style.display = "none";
      guardar();
      return;
    }

    let total = 0;
    let cantidadTotal = 0;

    carrito.forEach((item, index) => {
      const precio = Number(item.precio) || 0;
      const cantidad = Number(item.cantidad) || 1;
      const subtotal = precio * cantidad;
      total += subtotal;
      cantidadTotal += cantidad;

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
          <label>Cantidad</label>
          <input type="number" min="1" value="${cantidad}" data-index="${index}" class="cantidad-item" />
          <button type="button" class="btn btn-secondary eliminar" data-index="${index}">Eliminar</button>
        </div>
      `;
      contenedor.appendChild(div);
    });

    totalSpan.textContent = total.toLocaleString("es-CO");
    itemsResumen.textContent = cantidadTotal.toString();

    let mensaje = "Hola Estampaider, quiero cotizar estos productos:%0A%0A";
    carrito.forEach(item => {
      mensaje += `• ${item.nombre} x${item.cantidad} = $${(Number(item.precio) * Number(item.cantidad)).toLocaleString("es-CO")}%0A`;
    });
    mensaje += `%0ATotal: $${total.toLocaleString("es-CO")}`;

    btnWhatsapp.href = `https://wa.me/573153625992?text=${mensaje}`;
    btnWhatsapp.style.display = "inline-flex";
    guardar();
  }

  contenedor.addEventListener("input", (e) => {
    if (!e.target.classList.contains("cantidad-item")) return;
    const index = Number(e.target.dataset.index);
    const nuevaCantidad = Math.max(1, parseInt(e.target.value, 10) || 1);
    carrito[index].cantidad = nuevaCantidad;
    renderizarCarrito();
  });

  contenedor.addEventListener("click", (e) => {
    if (!e.target.classList.contains("eliminar")) return;
    const index = Number(e.target.dataset.index);
    carrito.splice(index, 1);
    renderizarCarrito();
  });

  renderizarCarrito();
});
