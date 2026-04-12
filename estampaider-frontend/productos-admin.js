document.addEventListener("DOMContentLoaded", () => {
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");

  if (!auth || auth.rol !== "ADMIN" || !auth.token) {
    sessionStorage.setItem("redirectAfterLogin", "productos-admin.html");
    window.location.href = "admin/login.html";
    return;
  }

  const API_BASE =
    window.ESTAMPAIDER_CONFIG?.API_BASE ||
    (typeof resolverApiBase === "function" ? resolverApiBase() : "http://localhost:8080");

  const listaProductos = document.getElementById("listaProductos");
  const formProducto = document.getElementById("formProducto");
  const tituloFormulario = document.getElementById("tituloFormulario");
  const estadoFormulario = document.getElementById("estadoFormulario");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnCancelarEdicion = document.getElementById("btnCancelarEdicion");
  const btnCerrarSesion = document.getElementById("btnCerrarSesion");
  const btnSubirImagen = document.getElementById("btnSubirImagen");
  const toast = document.getElementById("toastAdminProductos");
  const btnGuardarOrden = document.getElementById("btnGuardarOrden");
  let productosActuales = [];
  let draggingId = null;

  const campoId = document.getElementById("productoId");
  const campoNombre = document.getElementById("nombre");
  const campoPrecio = document.getElementById("precio");
  const campoCategoria = document.getElementById("categoria");
  const campoImagenUrl = document.getElementById("imagenUrl");
  const campoImagenArchivo = document.getElementById("imagenArchivo");
  const campoDescripcion = document.getElementById("descripcion");
  const previewImagen = document.getElementById("previewImagen");
  const campoEtiqueta = document.getElementById("etiqueta");

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${auth.token}`
    };
  }

  function getAuthOnlyHeaders() {
    return {
      "Authorization": `Bearer ${auth.token}`
    };
  }

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  function mostrarToast(texto, tipo = "info") {
    if (!toast) return;
    toast.textContent = texto;
    toast.className = `toast-admin-productos show ${tipo}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = "toast-admin-productos";
    }, 2600);
  }

  function mostrarEstado(texto, tipo = "info") {
    estadoFormulario.textContent = texto;
    estadoFormulario.className = `estado-admin estado-${tipo}`;
  }

  function limpiarFormulario() {
    campoId.value = "";
    campoNombre.value = "";
    campoPrecio.value = "";
    campoCategoria.value = "";
    campoImagenUrl.value = "";
    campoDescripcion.value = "";
    campoEtiqueta.value = "";
    if (campoImagenArchivo) campoImagenArchivo.value = "";
    previewImagen.src = "images/placeholder.jpg";
    tituloFormulario.textContent = "Nuevo producto";
    btnGuardar.textContent = "Guardar producto";
    mostrarEstado("");
  }

  function resolverSrcImagen(imagenUrl) {
    const valor = textoSeguro(imagenUrl).trim();
    if (!valor) return "images/placeholder.jpg";

    if (valor.startsWith("http://") || valor.startsWith("https://")) {
      return valor;
    }

    if (valor.startsWith("/uploads/")) {
      return `${API_BASE}${valor}`;
    }

    return `images/${valor}`;
  }

  function actualizarPreview() {
    previewImagen.src = resolverSrcImagen(campoImagenUrl.value);
  }

  campoImagenUrl.addEventListener("input", actualizarPreview);
  previewImagen.addEventListener("error", () => {
    previewImagen.src = "images/placeholder.jpg";
  });

  async function subirImagen() {
    const archivo = campoImagenArchivo?.files?.[0];

    if (!archivo) {
      mostrarEstado("Selecciona una imagen antes de subir.", "error");
      mostrarToast("Selecciona una imagen", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", archivo);

    btnSubirImagen.disabled = true;
    mostrarEstado("Subiendo imagen...", "info");

    try {
      const res = await fetch(`${API_BASE}/api/uploads/producto`, {
        method: "POST",
        headers: getAuthOnlyHeaders(),
        body: formData
      });

      if (!res.ok) {
        const texto = await res.text().catch(() => "");
        throw new Error(texto || "No se pudo subir la imagen");
      }

      const data = await res.json();
      campoImagenUrl.value = data.url || "";
      actualizarPreview();

      mostrarEstado("Imagen subida correctamente.", "ok");
      mostrarToast("Imagen subida correctamente", "ok");
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      mostrarEstado("No se pudo subir la imagen.", "error");
      mostrarToast("No se pudo subir la imagen", "error");
    } finally {
      btnSubirImagen.disabled = false;
    }
  }

  async function cargarProductos() {
    listaProductos.innerHTML = `<div class="empty-admin">Cargando productos...</div>`;

    try {
      const res = await fetch(`${API_BASE}/api/productos/admin/todos`, {
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("No se pudieron cargar los productos");

      const productos = await res.json();
      productosActuales = Array.isArray(productos) ? [...productos] : [];
      renderizarProductos(productos);
    } catch (error) {
      console.error("Error cargando productos:", error);
      listaProductos.innerHTML = `<div class="empty-admin">Error al cargar productos.</div>`;
      mostrarToast("Error al cargar productos", "error");
    }
  }

  function crearBoton(texto, clase, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `mini-btn ${clase}`;
    btn.textContent = texto;
    btn.onclick = onClick;
    return btn;
  }

  function crearBadgeEstado(activo) {
    const badge = document.createElement("span");
    badge.className = `badge-estado-producto ${activo ? "badge-activo" : "badge-inactivo"}`;
    badge.textContent = activo ? "● Activo" : "● Oculto";
    return badge;
  }

  function renderizarProductos(productos) {
    listaProductos.innerHTML = "";
  
    if (!Array.isArray(productos) || productos.length === 0) {
      listaProductos.innerHTML = `<div class="empty-admin">No hay productos registrados.</div>`;
      return;
    }
  
    const fragment = document.createDocumentFragment();
  
    productos.forEach((producto) => {
      const card = document.createElement("article");
      card.className = "producto-admin-card draggable";
      card.draggable = true;
      card.dataset.id = String(producto.id);
  
      card.addEventListener("dragstart", () => {
        draggingId = producto.id;
        card.classList.add("dragging");
      });
  
      card.addEventListener("dragend", () => {
        draggingId = null;
        card.classList.remove("dragging");
        document.querySelectorAll(".producto-admin-card").forEach(c => c.classList.remove("drag-over"));
      });
  
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        card.classList.add("drag-over");
      });
  
      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });
  
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
  
        if (!draggingId || draggingId === producto.id) return;
  
        reordenarProductos(draggingId, producto.id);
      });
  
      const img = document.createElement("img");
      img.src = resolverSrcImagen(producto.imagenUrl);
      img.alt = producto.nombre || "Producto";
      img.loading = "lazy";
      img.onerror = () => {
        img.src = "images/placeholder.jpg";
      };
  
      const body = document.createElement("div");
      body.className = "producto-admin-body";
  
      const badge = crearBadgeEstado(!!producto.activo);
  
      const nombre = document.createElement("h3");
      nombre.textContent = textoSeguro(producto.nombre);
  
      const precio = document.createElement("p");
      precio.className = "producto-admin-precio";
      precio.textContent = `$${(Number(producto.precio) || 0).toLocaleString("es-CO")}`;
  
      const categoria = document.createElement("p");
      categoria.textContent = `Categoría: ${textoSeguro(producto.categoria || "Sin categoría")}`;
  
      const descripcion = document.createElement("p");
      descripcion.textContent = textoSeguro(producto.descripcion || "Sin descripción");
  
      let etiquetaVisual = null;
  
      if (producto.etiqueta === "MAS_VENDIDO") {
        etiquetaVisual = document.createElement("span");
        etiquetaVisual.className = "badge-estado-producto";
        etiquetaVisual.style.background = "#dbeafe";
        etiquetaVisual.style.color = "#1d4ed8";
        etiquetaVisual.textContent = "🏆 Más vendido";
      }
  
      if (producto.etiqueta === "NUEVO") {
        etiquetaVisual = document.createElement("span");
        etiquetaVisual.className = "badge-estado-producto";
        etiquetaVisual.style.background = "#ede9fe";
        etiquetaVisual.style.color = "#6d28d9";
        etiquetaVisual.textContent = "✨ Nuevo";
      }
  
      const orden = document.createElement("p");
      orden.style.fontWeight = "700";
      orden.style.color = "#0f172a";
      orden.textContent = `Orden: ${(productosActuales.findIndex(p => p.id === producto.id) + 1)}`;
  
      const acciones = document.createElement("div");
      acciones.className = "producto-admin-acciones";
  
      const btnEditar = crearBoton("Editar", "mini-editar", () => {
        cargarProductoEnFormulario(producto);
      });
  
      const btnToggle = crearBoton(
        producto.activo ? "Ocultar" : "Activar",
        producto.activo ? "mini-toggle" : "mini-activar",
        async () => {
          await cambiarEstadoActivo(producto.id, !producto.activo);
        }
      );
  
      const btnEliminar = crearBoton("Eliminar", "mini-eliminar", async () => {
        await eliminarProducto(producto.id, producto.nombre);
      });
  
      acciones.append(btnEditar, btnToggle, btnEliminar);
  
      if (etiquetaVisual) {
        body.append(badge, etiquetaVisual, orden, nombre, precio, categoria, descripcion, acciones);
      } else {
        body.append(badge, orden, nombre, precio, categoria, descripcion, acciones);
      }
  
      card.append(img, body);
      fragment.appendChild(card);
    });
  
    listaProductos.appendChild(fragment);
  }

  function cargarProductoEnFormulario(producto) {
    campoId.value = producto.id || "";
    campoNombre.value = textoSeguro(producto.nombre);
    campoPrecio.value = producto.precio ?? "";
    campoCategoria.value = textoSeguro(producto.categoria);
    campoImagenUrl.value = textoSeguro(producto.imagenUrl);
    campoDescripcion.value = textoSeguro(producto.descripcion);
    campoEtiqueta.value = textoSeguro(producto.etiqueta);
    if (campoImagenArchivo) campoImagenArchivo.value = "";
    previewImagen.src = resolverSrcImagen(producto.imagenUrl);

    tituloFormulario.textContent = `Editando producto #${producto.id}`;
    btnGuardar.textContent = "Actualizar producto";
    mostrarEstado("Modo edición activado", "info");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reordenarProductos(idOrigen, idDestino) {
    const origenIndex = productosActuales.findIndex(p => p.id === idOrigen);
    const destinoIndex = productosActuales.findIndex(p => p.id === idDestino);
  
    if (origenIndex === -1 || destinoIndex === -1) return;
  
    const [movido] = productosActuales.splice(origenIndex, 1);
    productosActuales.splice(destinoIndex, 0, movido);
  
    renderizarProductos(productosActuales);
    mostrarToast("Orden cambiado. Pulsa 'Guardar orden' para aplicar.", "info");
  }
  
  async function guardarOrdenProductos() {
    try {
      btnGuardarOrden.disabled = true;
  
      const idsEnOrden = productosActuales.map(p => p.id);
  
      const res = await fetch(`${API_BASE}/api/productos/admin/orden`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(idsEnOrden)
      });
  
      if (!res.ok) {
        const texto = await res.text().catch(() => "");
        throw new Error(texto || "No se pudo guardar el orden");
      }
  
      sessionStorage.removeItem("estampaider_productos_cache_v1");
      localStorage.setItem("estampaider_productos_refresh", Date.now().toString());
  
      mostrarToast("Orden guardado correctamente", "ok");
      await cargarProductos();
    } catch (error) {
      console.error("Error guardando orden:", error);
      mostrarToast(error.message || "No se pudo guardar el orden", "error");
    } finally {
      btnGuardarOrden.disabled = false;
    }
  }
  function obtenerPayloadFormulario() {
    return {
      nombre: campoNombre.value.trim(),
      precio: Number(campoPrecio.value),
      categoria: campoCategoria.value.trim(),
      etiqueta: campoEtiqueta.value.trim(),
      imagenUrl: campoImagenUrl.value.trim(),
      descripcion: campoDescripcion.value.trim()
    };
  }

  function validarPayload(payload) {
    if (!payload.nombre) {
      mostrarEstado("El nombre es obligatorio.", "error");
      return false;
    }

    if (!payload.imagenUrl) {
      mostrarEstado("La imagen es obligatoria.", "error");
      return false;
    }

    if (!payload.precio || payload.precio <= 0) {
      mostrarEstado("El precio debe ser mayor a 0.", "error");
      return false;
    }

    return true;
  }

  async function guardarProducto(e) {
    e.preventDefault();

    const id = campoId.value.trim();
    const payload = obtenerPayloadFormulario();

    if (!validarPayload(payload)) return;

    btnGuardar.disabled = true;
    mostrarEstado(id ? "Actualizando producto..." : "Creando producto...", "info");

    try {
      const res = await fetch(
        id ? `${API_BASE}/api/productos/${id}` : `${API_BASE}/api/productos`,
        {
          method: id ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        const texto = await res.text().catch(() => "");
        throw new Error(texto || "No se pudo guardar el producto");
      }

      mostrarEstado(
        id ? "Producto actualizado correctamente." : "Producto creado correctamente.",
        "ok"
      );

      mostrarToast(
        id ? "Producto actualizado correctamente" : "Producto creado correctamente",
        "ok"
      );
      
      // limpiar cache de productos del frontend
      sessionStorage.removeItem("estampaider_productos_cache_v1");
      localStorage.setItem("estampaider_productos_refresh", Date.now().toString());

    limpiarFormulario();
    await cargarProductos();
    } catch (error) {
      console.error("Error guardando producto:", error);
      mostrarEstado("No se pudo guardar el producto.", "error");
      mostrarToast("No se pudo guardar el producto", "error");
    } finally {
      btnGuardar.disabled = false;
    }
  }

  async function cambiarEstadoActivo(id, activo) {
    try {
      const res = await fetch(`${API_BASE}/api/productos/${id}/activo`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ activo })
      });
  
      if (!res.ok) {
        const texto = await res.text().catch(() => "");
        throw new Error(texto || "No se pudo cambiar el estado del producto");
      }
  
      sessionStorage.removeItem("estampaider_productos_cache_v1");
      localStorage.setItem("estampaider_productos_refresh", Date.now().toString());
      await cargarProductos();
  
      mostrarToast(
        activo ? "Producto activado correctamente" : "Producto ocultado correctamente",
        "ok"
      );
    } catch (error) {
      console.error("Error cambiando estado:", error);
      mostrarToast(error.message || "No se pudo cambiar el estado del producto", "error");
    }
  }

  async function eliminarProducto(id, nombre) {
    const confirmado = confirm(`¿Eliminar el producto "${nombre}"?`);
    if (!confirmado) return;
  
    try {
      const res = await fetch(`${API_BASE}/api/productos/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
  
      if (!res.ok) {
        throw new Error("No se pudo eliminar el producto");
      }
  
      if (campoId.value === String(id)) {
        limpiarFormulario();
      }
  
      sessionStorage.removeItem("estampaider_productos_cache_v1");
      localStorage.setItem("estampaider_productos_refresh", Date.now().toString());
      await cargarProductos();
  
      mostrarEstado("Producto eliminado correctamente.", "ok");
      mostrarToast("Producto eliminado correctamente", "ok");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      mostrarEstado("No se pudo eliminar el producto.", "error");
      mostrarToast("No se pudo eliminar el producto", "error");
    }
  }

  formProducto.addEventListener("submit", guardarProducto);
  btnSubirImagen?.addEventListener("click", subirImagen);

  btnCancelarEdicion.addEventListener("click", () => {
    limpiarFormulario();
  });

  btnCerrarSesion.addEventListener("click", () => {
    sessionStorage.removeItem("auth");
    window.location.href = "admin/login.html";
  });

  limpiarFormulario();
  cargarProductos();
  btnGuardarOrden?.addEventListener("click", guardarOrdenProductos);
});