(function () {
    const API_BASE =
      window.ESTAMPAIDER_CONFIG?.API_BASE ||
      (typeof resolverApiBase === "function"
        ? resolverApiBase()
        : "http://localhost:8080");
  
    let estrellasSeleccionadas = 5;
  
    function escapeHtml(valor) {
      return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  
    function formatearFecha(fecha) {
      if (!fecha) return "";
      const d = new Date(fecha);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("es-CO");
    }
  
    function pintarEstrellas(cantidad) {
      const n = Math.max(1, Math.min(5, Number(cantidad) || 0));
      return "⭐".repeat(n);
    }
  
    function actualizarPromedio(resenas) {
      const totalEl = document.getElementById("resenaTotal");
      const promedioEl = document.getElementById("resenaPromedio");
      const promedioStarsEl = document.getElementById("resenaPromedioStars");
  
      const total = Array.isArray(resenas) ? resenas.length : 0;
      const promedio =
        total > 0
          ? resenas.reduce((acc, r) => acc + (Number(r.estrellas) || 0), 0) / total
          : 5;
  
      if (totalEl) totalEl.textContent = total;
      if (promedioEl) promedioEl.textContent = total > 0 ? promedio.toFixed(1) : "5.0";
      if (promedioStarsEl) promedioStarsEl.textContent = pintarEstrellas(Math.round(promedio));
    }
  
    function crearResenaCard(resena) {
      const respuestaHtml = resena.respuestaAdmin
        ? `
          <div class="resena-respuesta-admin" style="margin-top:12px;padding:12px 14px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;">
            <strong style="display:block;margin-bottom:6px;color:#1d4ed8;">Respuesta de Estampaider</strong>
            <p style="margin:0;color:#334155;line-height:1.6;">${escapeHtml(resena.respuestaAdmin)}</p>
          </div>
        `
        : "";
  
      return `
        <article class="resena-card">
          <div class="resena-top">
            <div>
              <h4 class="resena-nombre">${escapeHtml(resena.nombre)}</h4>
              <div class="resena-fecha">${formatearFecha(resena.fecha)}</div>
            </div>
            <div class="resena-estrellas">${pintarEstrellas(resena.estrellas)}</div>
          </div>
          <p class="resena-comentario">${escapeHtml(resena.comentario)}</p>
          ${respuestaHtml}
        </article>
      `;
    }
  
    async function cargarResenas() {
      const lista = document.getElementById("listaResenas");
      if (!lista) return;
  
      try {
        const res = await fetch(`${API_BASE}/api/resenas`);
        if (!res.ok) throw new Error("No se pudieron cargar las reseñas");
  
        const data = await res.json();
        actualizarPromedio(data);
  
        if (!Array.isArray(data) || !data.length) {
          lista.innerHTML = `
            <div class="sin-resenas">
              Aún no hay reseñas publicadas. Sé el primero en compartir tu experiencia ✨
            </div>
          `;
          return;
        }
  
        lista.innerHTML = data.map(crearResenaCard).join("");
      } catch (error) {
        console.error("Error cargando reseñas:", error);
        lista.innerHTML = `
          <div class="sin-resenas">
            No se pudieron cargar las reseñas en este momento.
          </div>
        `;
      }
    }
  
    async function enviarResena() {
      const nombreInput = document.getElementById("nombreResena");
      const comentarioInput = document.getElementById("comentarioResena");
      const boton = document.querySelector(".btn-resena");
  
      const nombre = nombreInput?.value.trim() || "";
      const comentario = comentarioInput?.value.trim() || "";
  
      if (!nombre || !comentario) {
        alert("Completa tu nombre y tu comentario.");
        return;
      }
  
      if (comentario.length < 8) {
        alert("Escribe un comentario un poco más completo.");
        return;
      }
  
      if (boton) {
        boton.disabled = true;
        boton.textContent = "Enviando...";
      }
  
      try {
        const res = await fetch(`${API_BASE}/api/resenas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            nombre,
            comentario,
            estrellas: estrellasSeleccionadas
          })
        });
  
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : await res.text();
  
        if (!res.ok) {
          throw new Error(typeof data === "string" ? data : "No se pudo enviar la reseña");
        }
  
        if (nombreInput) nombreInput.value = "";
        if (comentarioInput) comentarioInput.value = "";
  
        estrellasSeleccionadas = 5;
        const estrellas = document.querySelectorAll("#selectorEstrellas span");
        estrellas.forEach((s) => {
          s.classList.toggle("activa", Number(s.dataset.value) <= 5);
        });
  
        const textoEstrellas = document.getElementById("textoEstrellas");
        if (textoEstrellas) textoEstrellas.textContent = "Excelente experiencia";
  
        await cargarResenas();
        alert("Gracias por compartir tu experiencia ✨");
      } catch (error) {
        console.error("Error enviando reseña:", error);
        alert(error.message || "No se pudo enviar la reseña.");
      } finally {
        if (boton) {
          boton.disabled = false;
          boton.textContent = "Enviar reseña";
        }
      }
    }
  
    function inicializarEstrellas() {
      const estrellas = document.querySelectorAll("#selectorEstrellas span");
      if (!estrellas.length) return;
  
      estrellas.forEach((star) => {
        star.addEventListener("click", () => {
          const value = Number(star.dataset.value || 5);
          estrellasSeleccionadas = value;
  
          estrellas.forEach((s) => {
            s.classList.toggle("activa", Number(s.dataset.value) <= value);
          });
        });
      });
    }
  
    window.enviarResena = enviarResena;
  
    document.addEventListener("DOMContentLoaded", () => {
      inicializarEstrellas();
      cargarResenas();
    });
  })();