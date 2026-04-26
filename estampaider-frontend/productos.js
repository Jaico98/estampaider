// ============================================================
//  productos.js  —  Estampaider
// ============================================================

const API_BASE =
  window.ESTAMPAIDER_CONFIG?.API_BASE ||
  "https://estampaider.onrender.com";

const API_URL = `${API_BASE}/api/productos`;
const PRODUCTOS_CACHE_KEY = "estampaider_productos_cache_v1";

function resolverSrcImagen(imagenUrl) {
  const valor = String(imagenUrl || "").trim();

  if (!valor) return "images/hero-bg.jpg";

  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    return valor;
  }

  if (valor.startsWith("/uploads/")) {
    return `${API_BASE}${valor}`;
  }

  if (valor.startsWith("uploads/")) {
    return `${API_BASE}/${valor}`;
  }

  if (valor.startsWith("/images/")) {
    return valor;
  }

  return `images/${valor.replace(/^\.?\//, "")}`;
}

function guardarProductosCache(productos) {
  try {
    localStorage.setItem(PRODUCTOS_CACHE_KEY, JSON.stringify(productos));
  } catch {
    // ignorar
  }
}

function leerProductosCache() {
  try {
    const raw = localStorage.getItem(PRODUCTOS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parsearOpciones(valor) {
  return String(valor || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
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
      imagen.src = "images/hero-bg.jpg";
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

    const tallas = parsearOpciones(producto.tallasDisponibles);
    const colores = parsearOpciones(producto.coloresDisponibles);

    let selectTalla = null;
    let selectColor = null;

    if (tallas.length) {
      selectTalla = document.createElement("select");
      selectTalla.setAttribute("aria-label", "Seleccionar talla");

      const optDefault = document.createElement("option");
      optDefault.value = "";
      optDefault.textContent = "Selecciona talla";
      selectTalla.appendChild(optDefault);

      tallas.forEach((talla) => {
        const opt = document.createElement("option");
        opt.value = talla;
        opt.textContent = talla;
        selectTalla.appendChild(opt);
      });
    }

    if (colores.length) {
      selectColor = document.createElement("select");
      selectColor.setAttribute("aria-label", "Seleccionar color");

      const optDefault = document.createElement("option");
      optDefault.value = "";
      optDefault.textContent = "Selecciona color";
      selectColor.appendChild(optDefault);

      colores.forEach((color) => {
        const opt = document.createElement("option");
        opt.value = color;
        opt.textContent = color;
        selectColor.appendChild(opt);
      });
    }

    const botonCarrito = document.createElement("button");
    botonCarrito.textContent = "Agregar al carrito 🛒";
    botonCarrito.onclick = () => {
      const tallaSeleccionada = selectTalla ? selectTalla.value : "";
      const colorSeleccionado = selectColor ? selectColor.value : "";

      if (selectTalla && !tallaSeleccionada) {
        alert("Selecciona una talla.");
        return;
      }

      if (selectColor && !colorSeleccionado) {
        alert("Selecciona un color.");
        return;
      }

      agregarAlCarrito(
        producto,
        parseInt(cantidad.value, 10) || 1,
        tallaSeleccionada,
        colorSeleccionado
      );
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

    if (badge) card.appendChild(badge);

    card.appendChild(imagen);
    card.appendChild(nombre);
    card.appendChild(precio);

    if (selectTalla) card.appendChild(selectTalla);
    if (selectColor) card.appendChild(selectColor);

    card.appendChild(cantidad);
    card.appendChild(botonCarrito);
    card.appendChild(botonVer);
    card.appendChild(botonWhatsapp);

    fragment.appendChild(card);
  });

  contenedor.appendChild(fragment);
  inicializarFiltros();
}

async function cargarProductos() {
  const contenedor = document.getElementById("productos-container");
  if (!contenedor) return;

  const cache = leerProductosCache();

  if (cache && Array.isArray(cache) && cache.length) {
    renderizarProductos(cache);
  } else {
    contenedor.innerHTML = "<p>Cargando productos...</p>";
  }

  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error("Error al consultar la API");
    }

    const productos = await response.json();

    guardarProductosCache(productos);

    const cacheTexto = JSON.stringify(cache || []);
    const productosTexto = JSON.stringify(productos || []);

    if (cacheTexto !== productosTexto) {
      renderizarProductos(productos);
    }
  } catch (err) {
    console.error(err);

    if (cache && Array.isArray(cache) && cache.length) {
      return;
    }

    contenedor.innerHTML = "<p>Error al cargar productos. Intenta más tarde 😢</p>";
  }
}

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

function agregarAlCarrito(producto, cantidad, tallaSeleccionada = "", colorSeleccionado = "") {
  if (!cantidad || cantidad <= 0) {
    alert("Ingresa una cantidad válida.");
    return;
  }

  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  const existente = carrito.find((p) =>
    p.id === producto.id &&
    (p.tallaSeleccionada || "") === tallaSeleccionada &&
    (p.colorSeleccionado || "") === colorSeleccionado
  );

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      ...producto,
      cantidad,
      tallaSeleccionada,
      colorSeleccionado
    });
  }

  localStorage.setItem("carrito", JSON.stringify(carrito));

  if (typeof actualizarContadorCarrito === "function") {
    actualizarContadorCarrito();
  }

  if (typeof mostrarToastGlobal === "function") {
    let detalle = "";
    if (tallaSeleccionada) detalle += ` Talla: ${tallaSeleccionada}.`;
    if (colorSeleccionado) detalle += ` Color: ${colorSeleccionado}.`;

    mostrarToastGlobal(`"${producto.nombre}" agregado al carrito 🛒${detalle}`);
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

  const contenedorOpciones = document.getElementById("modalpOpciones");
  contenedorOpciones.innerHTML = "";

  const tallas = parsearOpciones(producto.tallasDisponibles);
  const colores = parsearOpciones(producto.coloresDisponibles);

  let selectTalla = null;
  let selectColor = null;

  if (tallas.length) {
    const wrapTalla = document.createElement("div");
    wrapTalla.className = "modalp-opcion";

    const label = document.createElement("label");
    label.textContent = "Talla:";

    selectTalla = document.createElement("select");
    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = "Selecciona talla";
    selectTalla.appendChild(optDefault);

    tallas.forEach((talla) => {
      const opt = document.createElement("option");
      opt.value = talla;
      opt.textContent = talla;
      selectTalla.appendChild(opt);
    });

    wrapTalla.append(label, selectTalla);
    contenedorOpciones.appendChild(wrapTalla);
  }

  if (colores.length) {
    const wrapColor = document.createElement("div");
    wrapColor.className = "modalp-opcion";

    const label = document.createElement("label");
    label.textContent = "Color:";

    selectColor = document.createElement("select");
    const optDefault = document.createElement("option");
    optDefault.value = "";
    optDefault.textContent = "Selecciona color";
    selectColor.appendChild(optDefault);

    colores.forEach((color) => {
      const opt = document.createElement("option");
      opt.value = color;
      opt.textContent = color;
      selectColor.appendChild(opt);
    });

    wrapColor.append(label, selectColor);
    contenedorOpciones.appendChild(wrapColor);
  }

  const inputCantidad = document.getElementById("modalpCantidad");
  inputCantidad.value = 1;

  document.getElementById("modalpCarrito").onclick = () => {
    const tallaSeleccionada = selectTalla ? selectTalla.value : "";
    const colorSeleccionado = selectColor ? selectColor.value : "";

    if (selectTalla && !tallaSeleccionada) {
      alert("Selecciona una talla.");
      return;
    }

    if (selectColor && !colorSeleccionado) {
      alert("Selecciona un color.");
      return;
    }

    agregarAlCarrito(
      producto,
      parseInt(inputCantidad.value, 10) || 1,
      tallaSeleccionada,
      colorSeleccionado
    );

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

window.addEventListener("storage", (event) => {
  if (event.key === "estampaider_productos_refresh") {
    localStorage.removeItem(PRODUCTOS_CACHE_KEY);
    cargarProductos();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();

  document.querySelectorAll(".fade-up").forEach((el) => {
    el.classList.add("visible");
  });
});