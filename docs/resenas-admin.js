const API_BASE =
  window.ESTAMPAIDER_CONFIG?.API_BASE ||
  (typeof resolverApiBase === "function"
    ? resolverApiBase()
    : "http://localhost:8080");

function getAuthHeaders() {
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");

  if (!auth || !auth.token) {
    window.location.href = "admin/login.html";
    throw new Error("Sesión inválida");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  };
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO");
}

function estrellas(n) {
  const valor = Math.max(1, Math.min(5, Number(n) || 0));
  return "⭐".repeat(valor);
}

function manejarErrorHTTP(res, data) {
  if (!res.ok) {
    const mensaje = typeof data === "string"
      ? data
      : (data?.mensaje || `Error HTTP ${res.status}`);
    throw new Error(mensaje);
  }
}

function crearCardAdmin(resena) {
  const wrapper = document.createElement("article");
  wrapper.className = "admin-resena-card";

  wrapper.innerHTML = `
    <div class="admin-resena-top">
      <div>
        <h3>${escapeHtml(resena.nombre)}</h3>
        <div class="admin-meta">${formatearFecha(resena.fecha)}</div>
      </div>
      <div class="admin-stars">${estrellas(resena.estrellas)}</div>
    </div>

    <p class="admin-comentario">${escapeHtml(resena.comentario)}</p>

    <div class="admin-respuesta">
      <strong>Respuesta de Estampaider</strong>
      <textarea id="respuesta-${resena.id}" placeholder="Escribe una respuesta para esta reseña...">${escapeHtml(resena.respuestaAdmin || "")}</textarea>
      <div class="admin-actions">
        <button class="btn-responder" data-id="${resena.id}">Guardar respuesta</button>
        <button class="btn-eliminar" data-id="${resena.id}">Eliminar reseña</button>
      </div>
    </div>
  `;

  const btnResponder = wrapper.querySelector(".btn-responder");
  const btnEliminar = wrapper.querySelector(".btn-eliminar");

  btnResponder.addEventListener("click", async () => {
    const textarea = document.getElementById(`respuesta-${resena.id}`);
    const respuesta = textarea?.value.trim() || "";

    if (!respuesta) {
      alert("Escribe una respuesta.");
      return;
    }

    btnResponder.disabled = true;
    btnResponder.textContent = "Guardando...";

    try {
      const res = await fetch(`${API_BASE}/api/resenas/${resena.id}/respuesta`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ respuesta }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      manejarErrorHTTP(res, data);

      alert("Respuesta guardada correctamente.");
      await cargarResenasAdmin();
    } catch (error) {
      console.error("Error respondiendo reseña:", error);
      alert(error.message || "No se pudo guardar la respuesta.");
    } finally {
      btnResponder.disabled = false;
      btnResponder.textContent = "Guardar respuesta";
    }
  });

  btnEliminar.addEventListener("click", async () => {
    const ok = confirm("¿Seguro que deseas eliminar esta reseña?");
    if (!ok) return;

    btnEliminar.disabled = true;
    btnEliminar.textContent = "Eliminando...";

    try {
      const res = await fetch(`${API_BASE}/api/resenas/${resena.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (res.status !== 204) {
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : await res.text();

        manejarErrorHTTP(res, data);
      }

      await cargarResenasAdmin();
    } catch (error) {
      console.error("Error eliminando reseña:", error);
      alert(error.message || "No se pudo eliminar la reseña.");
    } finally {
      btnEliminar.disabled = false;
      btnEliminar.textContent = "Eliminar reseña";
    }
  });

  return wrapper;
}

async function cargarResenasAdmin() {
  const lista = document.getElementById("listaResenasAdmin");
  if (!lista) return;

  try {
    const res = await fetch(`${API_BASE}/api/resenas`);

    if (!res.ok) {
      throw new Error("No se pudieron cargar las reseñas");
    }

    const data = await res.json();

    if (!Array.isArray(data) || !data.length) {
      lista.innerHTML = `<div class="empty-admin">Aún no hay reseñas registradas.</div>`;
      return;
    }

    lista.innerHTML = "";
    data.forEach((resena) => {
      lista.appendChild(crearCardAdmin(resena));
    });
  } catch (error) {
    console.error("Error cargando reseñas admin:", error);
    lista.innerHTML = `<div class="empty-admin">No se pudieron cargar las reseñas.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", cargarResenasAdmin);