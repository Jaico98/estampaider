// ============================================================
//  productos.js  —  Estampaider
// ============================================================

const API_BASE = resolverApiBase();
const API_URL = `${API_BASE}/api/productos`;
const PRODUCTOS_CACHE_KEY = "estampaider_productos_cache_v1";

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

function resolverSrcImagen(imagenUrl) {
  const valor = String(imagenUrl || "").trim();

  if (!valor) return "images/placeholder.jpg";

  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    return valor;
  }

  if (valor.startsWith("/uploads/")) {
    return `${API_BASE}${valor}`;
  }

  return `images/${valor}`;
}

function obtenerProductosCache() {
  try {
    const raw = sessionStorage.getItem(PRODUCTOS_CACHE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;

    return data;
  } catch {
    return null;
  }
}

function guardarProductosCache(productos) {
  try {
    sessionStorage.setItem(PRODUCTOS_CACHE_KEY, JSON.stringify(productos));
  } catch {
    // ignorar
  }
}

function renderizarProductos(productos) {
  const contenedor = document.getElementById("productos-container");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!Array.isArray(productos) || productos.length === 0) {
    contenedor.innerHTML = "<p>No hay productos disponibles.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();

  productos.forEach((producto) => {
    const card = document.createElement("div");
    card.classList.add("producto-card");
    card.dataset.categoria = (producto.categoria || "otros").toLowerCase();

    const precioValor = Number(producto.precio) || 0;

    let badge = null;

if (producto.etiqueta === "MAS_VENDIDO") {
  badge = document.createElement("span");
  badge.classList.add("badge", "top");
  badge.textContent = "Más vendido";
} else if (producto.etiqueta === "NUEVO") {
  badge = document.createElement("span");
  badge.classList.add("badge", "nuevo");
  badge.textContent = "Nuevo";
}

    const imagen = document.createElement("img");
    imagen.src = resolverSrcImagen(producto.imagenUrl);
    imagen.alt = producto.nombre || "Producto";
    imagen.loading = "lazy";
    imagen.decoding = "async";
    imagen.onerror = () => {
      imagen.src = "images/placeholder.jpg";
    };

    const nombre = document.createElement("h3");
    nombre.textContent = producto.nombre || "Producto sin nombre";

    const precio = document.createElement("p");
    precio.textContent = `$${precioValor.toLocaleString("es-CO")}`;

    const cantidad = document.createElement("input");
    cantidad.type = "number";
    cantidad.min = 1;
    cantidad.value = 1;
    cantidad.setAttribute("aria-label", "Cantidad");

    const botonCarrito = document.createElement("button");
    botonCarrito.textContent = "Agregar al carrito 🛒";
    botonCarrito.onclick = () => {
      agregarAlCarrito(producto, parseInt(cantidad.value, 10) || 1);
    };

    const botonVer = document.createElement("button");
    botonVer.textContent = "Ver producto 👁️";
    botonVer.onclick = () => abrirModalp(producto, precioValor);

    const botonWhatsapp = document.createElement("a");
    botonWhatsapp.href = `https://wa.me/573153625992?text=${encodeURIComponent(
      `Hola 👋 quiero cotizar este producto:\n\n${producto.nombre}\nPrecio: $${precioValor.toLocaleString("es-CO")}`
    )}`;
    botonWhatsapp.target = "_blank";
    botonWhatsapp.rel = "noopener noreferrer";
    botonWhatsapp.className = "btn-whatsapp-producto";
    botonWhatsapp.textContent = "💬 Cotizar por WhatsApp";

    if (badge) {
      card.append(
        badge,
        imagen,
        nombre,
        precio,
        cantidad,
        botonCarrito,
        botonVer,
        botonWhatsapp
      );
    } else {
      card.append(
        imagen,
        nombre,
        precio,
        cantidad,
        botonCarrito,
        botonVer,
        botonWhatsapp
      );
    }

    fragment.appendChild(card);
  });

  contenedor.appendChild(fragment);
  inicializarFiltros();
}

async function cargarProductos() {
  const contenedor = document.getElementById("productos-container");
  if (!contenedor) return;

 // 🔥 FORZAR SIEMPRE DATOS FRESCOS
  sessionStorage.removeItem(PRODUCTOS_CACHE_KEY);

  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Error al consultar la API");
    }

    const productos = await response.json();
    guardarProductosCache(productos);
    renderizarProductos(productos);
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = "<p>Error al cargar productos. Intenta más tarde 😢</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();

  document.querySelectorAll(".fade-up").forEach((el) => {
    el.classList.add("visible");
  });
});
window.addEventListener("storage", (event) => {
  if (event.key === "estampaider_productos_refresh") {
    sessionStorage.removeItem(PRODUCTOS_CACHE_KEY);
    cargarProductos();
  }
});

function inicializarFiltros() {
  document.querySelectorAll(".filtrosp button").forEach((btn) => {
    btn.onclick = () => {
      document
        .querySelectorAll(".filtrosp button")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");

      const filtro = btn.dataset.filtro;

      document.querySelectorAll(".producto-card").forEach((card) => {
        const nombre = (card.querySelector("h3")?.textContent || "").toLowerCase();
        const categoria = card.dataset.categoria || "";

        let visible = false;

        if (filtro === "todos") {
          visible = true;
        } else if (filtro === "camisetas") {
          visible = nombre.includes("camiseta") || categoria.includes("camiseta");
        } else if (filtro === "mugs") {
          visible =
            nombre.includes("mug") ||
            nombre.includes("pocillo") ||
            categoria.includes("mug");
        } else if (filtro === "otros") {
          visible =
            !nombre.includes("camiseta") &&
            !nombre.includes("mug") &&
            !nombre.includes("pocillo");
        }

        card.style.display = visible ? "block" : "none";
      });
    };
  });
}

function agregarAlCarrito(producto, cantidad) {
  if (!cantidad || cantidad <= 0) {
    alert("Ingresa una cantidad válida.");
    return;
  }

  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const existente = carrito.find((p) => p.id === producto.id);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({ ...producto, cantidad });
  }

  localStorage.setItem("carrito", JSON.stringify(carrito));

  if (typeof actualizarContadorCarrito === "function") {
    actualizarContadorCarrito();
  }

  if (typeof mostrarToastGlobal === "function") {
    mostrarToastGlobal(`"${producto.nombre}" agregado al carrito 🛒`);
  }

  const sonido = document.getElementById("sonido-carrito");
  if (sonido) {
    sonido.currentTime = 0;
    sonido.play().catch(() => {});
  }
}

function abrirModalp(producto, precioValor) {
  const modalp = document.getElementById("modalpProducto");
  if (!modalp) return;

  document.getElementById("modalpImagen").src =
    resolverSrcImagen(producto.imagenUrl);

  document.getElementById("modalpNombre").textContent = producto.nombre;
  document.getElementById("modalpPrecio").textContent =
    `$${precioValor.toLocaleString("es-CO")}`;

  document.getElementById("modalpDescripcion").textContent =
    producto.descripcion || "Producto personalizable a tu gusto.";

  const inputCantidad = document.getElementById("modalpCantidad");
  inputCantidad.value = 1;

  document.getElementById("modalpCarrito").onclick = () => {
    agregarAlCarrito(producto, parseInt(inputCantidad.value, 10) || 1);
    modalp.classList.add("hidden");
  };

  document.getElementById("modalpWhatsapp").href =
    `https://wa.me/573153625992?text=${encodeURIComponent(
      `Hola 👋 quiero cotizar este producto:\n\n${producto.nombre}\nPrecio: $${precioValor.toLocaleString("es-CO")}`
    )}`;

  modalp.classList.remove("hidden");
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("cerrar-modalp")) {
    document.getElementById("modalpProducto")?.classList.add("hidden");
  }

  if (e.target.id === "modalpProducto") {
    e.target.classList.add("hidden");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("modalpProducto")?.classList.add("hidden");
  }
});
document.addEventListener("DOMContentLoaded", () => {
  // 🔥 SIEMPRE BORRAR CACHE AL ENTRAR
  sessionStorage.removeItem(PRODUCTOS_CACHE_KEY);

  cargarProductos();

  document.querySelectorAll(".fade-up").forEach((el) => {
    el.classList.add("visible");
  });
});