const API_URL = "http://localhost:8080/api/productos";
const WHATSAPP_NUMBER = "573153625992";

const emojiPorCategoria = {
  camisetas: "👕",
  mugs: "☕",
  otros: "🎁"
};

let productosCache = [];
let productoModalActual = null;

function formatearPrecio(valor) {
  return `$${(Number(valor) || 0).toLocaleString("es-CO")}`;
}

function actualizarContadorCarritoLocal() {
  if (typeof actualizarContadorCarrito === "function") {
    actualizarContadorCarrito();
  }
}

function agregarAlCarrito(producto, cantidad = 1) {
  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const existente = carrito.find(item => item.id === producto.id);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio) || 0,
      cantidad,
      imagenUrl: producto.imagenUrl || "",
      categoria: producto.categoria || "otros"
    });
  }

  localStorage.setItem("carrito", JSON.stringify(carrito));
  actualizarContadorCarritoLocal();

  if (typeof mostrarToastGlobal === "function") {
    mostrarToastGlobal(`${producto.nombre} agregado al carrito`);
  } else {
    alert("Producto agregado al carrito");
  }
}

function abrirModal(producto) {
  productoModalActual = producto;
  const modal = document.getElementById("productoModal");
  document.getElementById("modalNombre").textContent = producto.nombre;
  document.getElementById("modalDescripcion").textContent = producto.descripcion || "Producto personalizado listo para cotizar o comprar.";
  document.getElementById("modalImagen").textContent = emojiPorCategoria[(producto.categoria || "otros").toLowerCase()] || "🛍️";
  document.getElementById("modalCantidad").value = 1;
  document.getElementById("modalWhatsapp").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola Estampaider, quiero cotizar este producto:%0A%0A${producto.nombre}%0APrecio: ${formatearPrecio(producto.precio)}`)}`;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function cerrarModal() {
  const modal = document.getElementById("productoModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  productoModalActual = null;
}

function crearTarjetaProducto(producto) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.categoria = (producto.categoria || "otros").toLowerCase();

  const categoria = (producto.categoria || "otros").toLowerCase();
  const emoji = emojiPorCategoria[categoria] || "🛍️";

  card.innerHTML = `
    <div class="product-media">${emoji}</div>
    <div class="product-content">
      <span class="badge-pill">${categoria === "camisetas" ? "Más pedido" : categoria === "mugs" ? "Regalo ideal" : "Personalizable"}</span>
      <h3>${producto.nombre}</h3>
      <p>${producto.descripcion || "Personalización de alta calidad para cada ocasión."}</p>
      <div class="product-price">${formatearPrecio(producto.precio)}</div>
      <div class="qty-wrap">
        <label>Cantidad</label>
        <input type="number" min="1" value="1" aria-label="Cantidad" />
      </div>
      <div class="product-actions">
        <button class="btn btn-primary btn-agregar" type="button">Agregar al carrito</button>
        <button class="btn btn-secondary btn-ver" type="button">Ver detalle</button>
        <a class="whatsapp-btn" target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp</a>
      </div>
    </div>
  `;

  const inputCantidad = card.querySelector("input");
  const btnAgregar = card.querySelector(".btn-agregar");
  const btnVer = card.querySelector(".btn-ver");
  const btnWhatsapp = card.querySelector(".whatsapp-btn");

  btnAgregar.addEventListener("click", () => {
    agregarAlCarrito(producto, Math.max(1, parseInt(inputCantidad.value, 10) || 1));
  });

  btnVer.addEventListener("click", () => abrirModal(producto));
  btnWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola Estampaider, quiero cotizar este producto:%0A%0A${producto.nombre}%0APrecio: ${formatearPrecio(producto.precio)}`)}`;

  return card;
}

function renderizarProductos(filtro = "todos") {
  const contenedor = document.getElementById("productos-container");
  contenedor.innerHTML = "";

  const productosFiltrados = filtro === "todos"
    ? productosCache
    : productosCache.filter(p => (p.categoria || "otros").toLowerCase() === filtro);

  if (!productosFiltrados.length) {
    contenedor.innerHTML = '<div class="empty-state">No hay productos disponibles para esta categoría.</div>';
    return;
  }

  productosFiltrados.forEach(producto => contenedor.appendChild(crearTarjetaProducto(producto)));
}

function inicializarFiltros() {
  const botones = document.querySelectorAll(".filter-btn");
  botones.forEach(btn => {
    btn.addEventListener("click", () => {
      botones.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderizarProductos(btn.dataset.filter || "todos");
    });
  });
}

async function cargarProductos() {
  const contenedor = document.getElementById("productos-container");
  contenedor.innerHTML = '<div class="notice">Cargando productos...</div>';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("No se pudo cargar el catálogo");
    productosCache = await response.json();

    if (!Array.isArray(productosCache)) {
      productosCache = [];
    }

    renderizarProductos();
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<div class="empty-state">Error al cargar productos. Verifica que el backend esté encendido.</div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarFiltros();
  cargarProductos();
  actualizarContadorCarritoLocal();

  document.getElementById("cerrarModal").addEventListener("click", cerrarModal);
  document.getElementById("productoModal").addEventListener("click", (e) => {
    if (e.target.id === "productoModal") cerrarModal();
  });

  document.getElementById("modalAgregar").addEventListener("click", () => {
    if (!productoModalActual) return;
    const cantidad = Math.max(1, parseInt(document.getElementById("modalCantidad").value, 10) || 1);
    agregarAlCarrito(productoModalActual, cantidad);
    cerrarModal();
  });
});
