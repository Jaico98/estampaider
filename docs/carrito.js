document.addEventListener("DOMContentLoaded", () => {
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  const contenedor = document.getElementById("carrito");
  const totalSpan = document.getElementById("total");
  const btnWhatsapp = document.getElementById("whatsappCarrito");
  const btnVaciarCarrito = document.getElementById("btnVaciarCarrito");

  const WHATSAPP_NUMBER =
    window.ESTAMPAIDER_CONFIG?.WHATSAPP_NUMBER || "573153625992";

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  function crearLineaDetalle(texto) {
    const small = document.createElement("div");
    small.className = "item-detalle";
    small.textContent = texto;
    return small;
  }

  function crearItemCarrito(item, index) {
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
      div.appendChild(crearLineaDetalle(`Talla: ${talla}`));
    }

    if (color) {
      div.appendChild(crearLineaDetalle(`Color: ${color}`));
    }

    const br1 = document.createElement("br");

    const labelCantidad = document.createElement("label");
    labelCantidad.textContent = "Cantidad: ";

    const inputCantidad = document.createElement("input");
    inputCantidad.type = "number";
    inputCantidad.min = "1";
    inputCantidad.value = String(cantidad);
    inputCantidad.dataset.index = String(index);

    labelCantidad.appendChild(inputCantidad);

    const br2 = document.createElement("br");

    const subtotalTexto = document.createElement("span");
    subtotalTexto.textContent = `Subtotal: $${subtotal.toLocaleString("es-CO")}`;

    const br3 = document.createElement("br");

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "eliminar";
    btnEliminar.dataset.index = String(index);
    btnEliminar.type = "button";
    btnEliminar.textContent = "❌ Eliminar";

    div.append(
      br1,
      labelCantidad,
      br2,
      subtotalTexto,
      br3,
      btnEliminar
    );

    return { elemento: div, subtotal };
  }

  function actualizarLinkWhatsapp(total) {
    if (!btnWhatsapp) return;

    if (!Array.isArray(carrito) || carrito.length === 0) {
      btnWhatsapp.style.display = "none";
      return;
    }

    let mensaje = "Hola, quiero cotizar estos productos:\n\n";

    carrito.forEach((item) => {
      const precio = Number(item.precio) || 0;
      const cantidad = Number(item.cantidad) || 0;
      const talla = textoSeguro(item.tallaSeleccionada).trim();
      const color = textoSeguro(item.colorSeleccionado).trim();

      let linea = `• ${textoSeguro(item.nombre)}`;

      if (talla) {
        linea += ` | Talla: ${talla}`;
      }

      if (color) {
        linea += ` | Color: ${color}`;
      }

      linea += ` | Cantidad: ${cantidad} | Subtotal: $${(precio * cantidad).toLocaleString("es-CO")}`;

      mensaje += `${linea}\n`;
    });

    mensaje += `\nTotal: $${total.toLocaleString("es-CO")}`;

    btnWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    btnWhatsapp.style.display = "inline-block";
  }

  function renderizarCarrito() {
    contenedor.innerHTML = "";
    let total = 0;

    if (!Array.isArray(carrito) || carrito.length === 0) {
      contenedor.textContent = "El carrito está vacío";
      totalSpan.textContent = "0";
      actualizarLinkWhatsapp(0);
      actualizarContadorCarrito();
      return;
    }

    const fragment = document.createDocumentFragment();

    carrito.forEach((item, index) => {
      const { elemento, subtotal } = crearItemCarrito(item, index);
      total += subtotal;
      fragment.appendChild(elemento);
    });

    contenedor.appendChild(fragment);
    totalSpan.textContent = total.toLocaleString("es-CO");

    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarLinkWhatsapp(total);
    actualizarContadorCarrito();
  }

  contenedor.addEventListener("input", (e) => {
    if (e.target.type !== "number") return;

    const index = Number(e.target.dataset.index);
    const nuevaCantidad = parseInt(e.target.value, 10);

    if (!Number.isInteger(index) || index < 0 || index >= carrito.length) return;

    if (Number.isInteger(nuevaCantidad) && nuevaCantidad > 0) {
      carrito[index].cantidad = nuevaCantidad;
      renderizarCarrito();
    }
  });

  contenedor.addEventListener("click", (e) => {
    if (!e.target.classList.contains("eliminar")) return;

    const index = Number(e.target.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= carrito.length) return;

    carrito.splice(index, 1);
    renderizarCarrito();
  });

  btnVaciarCarrito?.addEventListener("click", () => {
    if (!carrito.length) return;

    const confirmado = confirm("¿Seguro que deseas vaciar el carrito?");
    if (!confirmado) return;

    carrito = [];
    localStorage.setItem("carrito", JSON.stringify(carrito));
    renderizarCarrito();
  });

  renderizarCarrito();
});

// CONTADOR GLOBAL DEL CARRITO
function actualizarContadorCarrito() {
  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const total = carrito.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
  const contador = document.getElementById("contador-carrito");
  if (contador) contador.textContent = total;
}
