// ============================================================
//  productos.js  —  Estampaider
//  Carga productos desde la API, maneja filtros y modal
// ============================================================

const API_URL = "http://localhost:8080/api/productos";

document.addEventListener("DOMContentLoaded", () => {

    const contenedor = document.getElementById("productos-container");

    // ── Cargar productos ──────────────────────────────────────
    fetch(API_URL)
        .then(response => {
            if (!response.ok) throw new Error("Error al consultar la API");
            return response.json();
        })
        .then(productos => {
            contenedor.innerHTML = "";

            if (!Array.isArray(productos) || productos.length === 0) {
                contenedor.innerHTML = "<p>No hay productos disponibles.</p>";
                return;
            }

            productos.forEach(producto => {
                const card = document.createElement("div");
                card.classList.add("producto-card");
                // Guardar categoría como data attribute para filtros
                card.dataset.categoria = (producto.categoria || "otros").toLowerCase();

                // 🏷️ BADGE
                const badge = document.createElement("span");
                badge.classList.add("badge", producto.precio >= 30000 ? "top" : "nuevo");
                badge.textContent = producto.precio >= 30000 ? "Más vendido" : "Nuevo";
                card.appendChild(badge);

                // 🖼️ IMAGEN
                const imagen = document.createElement("img");
                imagen.src   = `images/${producto.imagenUrl || "placeholder.jpg"}`;
                imagen.alt   = producto.nombre;
                imagen.loading = "lazy";

                // 🏷️ NOMBRE
                const nombre = document.createElement("h3");
                nombre.textContent = producto.nombre;

                // 💲 PRECIO
                const precioValor = Number(producto.precio) || 0;
                const precio = document.createElement("p");
                precio.textContent = `$${precioValor.toLocaleString("es-CO")}`;

                // 🔢 CANTIDAD
                const cantidad = document.createElement("input");
                cantidad.type  = "number";
                cantidad.min   = 1;
                cantidad.value = 1;
                cantidad.setAttribute("aria-label", "Cantidad");

                // 🛒 BOTÓN CARRITO
                const botonCarrito = document.createElement("button");
                botonCarrito.textContent = "Agregar al carrito 🛒";
                botonCarrito.onclick = () => {
                    agregarAlCarrito(producto, parseInt(cantidad.value) || 1);
                };

                // 👁️ VER PRODUCTO (MODAL)
                const botonVer = document.createElement("button");
                botonVer.textContent = "Ver producto 👁️";
                botonVer.onclick = () => abrirModalp(producto, precioValor);

                // 💬 WHATSAPP
                const botonWhatsapp = document.createElement("a");
                botonWhatsapp.href = `https://wa.me/573153625992?text=${encodeURIComponent(
                    `Hola 👋 quiero cotizar este producto:\n\n${producto.nombre}\nPrecio: $${precioValor.toLocaleString("es-CO")}`
                )}`;
                botonWhatsapp.target    = "_blank";
                botonWhatsapp.rel       = "noopener noreferrer";
                botonWhatsapp.className = "btn-whatsapp-producto";
                botonWhatsapp.textContent = "💬 Cotizar por WhatsApp";

                card.append(imagen, nombre, precio, cantidad, botonCarrito, botonVer, botonWhatsapp);
                contenedor.appendChild(card);
            });

            // Inicializar filtros después de cargar los productos
            inicializarFiltros();
        })
        .catch(err => {
            console.error(err);
            contenedor.innerHTML = "<p>Error al cargar productos. Intenta más tarde 😢</p>";
        });

    // ── Animaciones scroll ────────────────────────────────────
    document.querySelectorAll(".fade-up").forEach(el => {
        el.classList.add("visible");
    });
});

// ── Filtros ───────────────────────────────────────────────────
function inicializarFiltros() {
    document.querySelectorAll(".filtrosp button").forEach(btn => {
        btn.addEventListener("click", () => {

            document.querySelectorAll(".filtrosp button")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");

            const filtro = btn.dataset.filtro;

            document.querySelectorAll(".producto-card").forEach(card => {
                const nombre    = (card.querySelector("h3")?.textContent || "").toLowerCase();
                const categoria = card.dataset.categoria || "";

                let visible = false;

                if (filtro === "todos") {
                    visible = true;
                } else if (filtro === "camisetas") {
                    visible = nombre.includes("camiseta") || categoria.includes("camiseta");
                } else if (filtro === "mugs") {
                    visible = nombre.includes("mug") || nombre.includes("pocillo") || categoria.includes("mug");
                } else if (filtro === "otros") {
                    visible = !nombre.includes("camiseta") && !nombre.includes("mug") && !nombre.includes("pocillo");
                }

                card.style.display = visible ? "block" : "none";
            });
        });
    });
}

// ── Agregar al carrito ────────────────────────────────────────
function agregarAlCarrito(producto, cantidad) {
    if (!cantidad || cantidad <= 0) {
        alert("Ingresa una cantidad válida.");
        return;
    }

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const existente = carrito.find(p => p.id === producto.id);

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

    // Sonido de notificación
    const sonido = document.getElementById("sonido-carrito");
    if (sonido) {
        sonido.currentTime = 0;
        sonido.play().catch(() => {});
    }
}

// ── Modal de producto ─────────────────────────────────────────
function abrirModalp(producto, precioValor) {
    const modalp = document.getElementById("modalpProducto");

    document.getElementById("modalpImagen").src =
        `images/${producto.imagenUrl || "placeholder.jpg"}`;

    document.getElementById("modalpNombre").textContent = producto.nombre;
    document.getElementById("modalpPrecio").textContent =
        `$${precioValor.toLocaleString("es-CO")}`;

    document.getElementById("modalpDescripcion").textContent =
        producto.descripcion || "Producto personalizable a tu gusto.";

    const inputCantidad = document.getElementById("modalpCantidad");
    inputCantidad.value = 1;

    document.getElementById("modalpCarrito").onclick = () => {
        agregarAlCarrito(producto, parseInt(inputCantidad.value) || 1);
        modalp.classList.add("hidden");
    };

    document.getElementById("modalpWhatsapp").href =
        `https://wa.me/573153625992?text=${encodeURIComponent(
            `Hola 👋 quiero cotizar este producto:\n\n${producto.nombre}\nPrecio: $${precioValor.toLocaleString("es-CO")}`
        )}`;

    modalp.classList.remove("hidden");
}

// ── Cerrar modal ──────────────────────────────────────────────
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("cerrar-modalp")) {
        document.getElementById("modalpProducto").classList.add("hidden");
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
