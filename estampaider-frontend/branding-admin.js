// ============================================================
// branding-admin.js — Estampaider
// Panel de administración de branding (fondo, videos, redes)
// ============================================================

function getAPI() {
  return window.ESTAMPAIDER_CONFIG?.API_BASE || "http://localhost:8080";
}

function getAuth() {
  return JSON.parse(sessionStorage.getItem("auth") || "null");
}

function authHeaders() {
  const auth = getAuth();

  if (!auth || !auth.token) {
    window.location.href = "admin/login.html";
    throw new Error("Sesión inválida");
  }

  return {
    Authorization: `Bearer ${auth.token}`
  };
}

function authJsonHeaders() {
  return {
    "Content-Type": "application/json",
    ...authHeaders()
  };
}

function msg(texto, ok = true) {
  const el = document.getElementById("brandingStatus");
  if (!el) return;

  el.textContent = texto;
  el.style.color = ok ? "#166534" : "#b91c1c";
}

function limpiarPreviewVideo() {
  const video = document.getElementById("previewVideoActual");
  if (!video) return;

  try {
    video.pause();
  } catch (_) {}

  video.removeAttribute("src");
  video.load();
}

function obtenerIndiceGaleriaDesdeSlot(slot) {
  const match = String(slot || "").match(/^gallery(\d+)$/);
  return match ? Number(match[1]) : null;
}

function obtenerVideoPorSlot(data, slot) {
  if (!data) return "";

  if (slot === "hero") return data.heroMainVideoUrl || "";
  if (slot === "highlight") return data.highlightVideoUrl || "";
  if (slot === "new") return "";

  const indice = obtenerIndiceGaleriaDesdeSlot(slot);
  if (!indice) return "";

  if (!Array.isArray(data.galleryVideos)) return "";

  const video = data.galleryVideos.find(item => item?.slot === slot);
  return video?.url || "";
}

function obtenerSlotsGaleriaOcupados(data) {
  if (!Array.isArray(data?.galleryVideos)) return new Set();

  return new Set(
    data.galleryVideos
      .map(item => item?.slot)
      .filter(slot => /^gallery\d+$/.test(String(slot || "")))
  );
}

function obtenerPrimerSlotLibre(data) {
  const ocupados = obtenerSlotsGaleriaOcupados(data);

  let i = 1;
  while (ocupados.has(`gallery${i}`)) {
    i++;
  }

  return `gallery${i}`;
}

async function fetchBrandingCurrent() {
  const API = getAPI();
  const res = await fetch(`${API}/api/branding/current`, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("No se pudo cargar branding");
  }

  return res.json();
}

function actualizarOpcionesGaleria(data) {
  const selector = document.getElementById("videoSlot");
  if (!selector) return;

  const valorActual = selector.value;

  Array.from(selector.querySelectorAll('option[data-gallery-dinamica="true"]'))
    .forEach(opt => opt.remove());

  const galleryVideos = Array.isArray(data?.galleryVideos) ? data.galleryVideos : [];

  const indices = galleryVideos
    .map(item => obtenerIndiceGaleriaDesdeSlot(item?.slot))
    .filter(n => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);

  const siguienteLibre = obtenerIndiceGaleriaDesdeSlot(obtenerPrimerSlotLibre(data)) || 1;

  const indicesAMostrar = [...indices];
  if (!indicesAMostrar.includes(siguienteLibre)) {
    indicesAMostrar.push(siguienteLibre);
  }

  indicesAMostrar.sort((a, b) => a - b);

  indicesAMostrar.forEach((i) => {
    const value = `gallery${i}`;
    if (selector.querySelector(`option[value="${value}"]`)) return;

    const option = document.createElement("option");
    option.value = value;
    option.textContent = i === siguienteLibre && !indices.includes(i)
      ? `Galería ${i} (nueva posición)`
      : `Galería ${i}`;
    option.setAttribute("data-gallery-dinamica", "true");
    selector.appendChild(option);
  });

  const existeValorActual = Array.from(selector.options).some(opt => opt.value === valorActual);
  selector.value = existeValorActual ? valorActual : "hero";
}

async function cargarBrandingAdmin() {
  try {
    const data = await fetchBrandingCurrent();

    const bg = document.getElementById("previewHeroBg");
    if (bg) {
      if (data.heroBackgroundUrl) {
        bg.src = `${getAPI()}${data.heroBackgroundUrl}?v=${Date.now()}`;
        bg.style.display = "block";
      } else {
        bg.removeAttribute("src");
        bg.style.display = "none";
      }
    }

    const tiktok = document.getElementById("tiktokLink");
    const instagram = document.getElementById("instagramLink");
    const facebook = document.getElementById("facebookLink");

    if (tiktok) tiktok.value = data.socialLinks?.tiktok || "";
    if (instagram) instagram.value = data.socialLinks?.instagram || "";
    if (facebook) facebook.value = data.socialLinks?.facebook || "";

    actualizarOpcionesGaleria(data);
    actualizarPreviewVideo(data);
  } catch (error) {
    console.error("Error cargando branding:", error);
    msg("Error cargando branding", false);
  }
}

async function actualizarPreviewVideo(dataManual = null) {
  try {
    const data = dataManual || await fetchBrandingCurrent();
    const slot = document.getElementById("videoSlot")?.value || "hero";
    const preview = document.getElementById("previewVideoActual");

    if (!preview) return;

    if (slot === "new") {
      limpiarPreviewVideo();
      return;
    }

    const actual = obtenerVideoPorSlot(data, slot);

    if (!actual) {
      limpiarPreviewVideo();
      return;
    }

    const urlFinal = /^https?:\/\//i.test(actual)
      ? `${actual}${actual.includes("?") ? "&" : "?"}v=${Date.now()}`
      : `${getAPI()}${actual}?v=${Date.now()}`;

    preview.pause();
    preview.src = urlFinal;
    preview.load();
  } catch (error) {
    console.error("Error actualizando preview:", error);
    limpiarPreviewVideo();
  }
}

async function subirHeroBackground() {
  const file = document.getElementById("heroBackgroundFile")?.files?.[0];

  if (!file) {
    msg("Selecciona una imagen", false);
    return;
  }

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(`${getAPI()}/api/branding/hero-background`, {
      method: "POST",
      headers: authHeaders(),
      body: fd
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      throw new Error(typeof data === "string" ? data : "No se pudo guardar el fondo");
    }

    localStorage.setItem("estampaider_home_refresh", Date.now().toString());
    msg("Fondo actualizado correctamente");
    await cargarBrandingAdmin();
    document.getElementById("heroBackgroundFile").value = "";
  } catch (error) {
    console.error(error);
    msg(error.message || "Error subiendo fondo", false);
  }
}

async function subirVideoHome() {
  const file = document.getElementById("videoFile")?.files?.[0];
  const slot = document.getElementById("videoSlot")?.value || "hero";

  if (!file) {
    msg("Selecciona un video", false);
    return;
  }

  try {
    if (slot === "new") {
      await agregarVideo();
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", slot);

    const res = await fetch(`${getAPI()}/api/branding/home-video`, {
      method: "POST",
      headers: authHeaders(),
      body: fd
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const mensaje =
        typeof data === "string"
          ? data
          : (data?.message || data?.error || "No se pudo guardar el video");

      throw new Error(mensaje);
    }

    localStorage.setItem("estampaider_home_refresh", Date.now().toString());
    msg(`Video guardado correctamente en ${slot}`);
    await cargarBrandingAdmin();
    document.getElementById("videoFile").value = "";
  } catch (error) {
    console.error(error);
    msg(error.message || "Error guardando video", false);
  }
}

async function agregarVideo(e) {
  e.preventDefault();

  const input = document.getElementById("nuevoVideo");
  const slotSelect = document.getElementById("videoSlot");
  const archivo = input?.files?.[0];
  const slot = slotSelect?.value;

  if (!archivo) {
    alert("Selecciona un video.");
    return;
  }

  if (!slot) {
    alert("Selecciona una posición de video.");
    return;
  }

  const token = obtenerToken?.();
  if (!token) {
    alert("Tu sesión no es válida. Inicia sesión nuevamente.");
    return;
  }

  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("slot", slot);

  try {
    const resp = await fetch(`${API}/api/branding/gallery-video`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (resp.status === 401) {
      alert("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    if (resp.status === 403) {
      const auth = JSON.parse(sessionStorage.getItem("auth") || "null");
      console.error("403 al agregar video", {
        slot,
        auth,
        tokenPreview: token ? token.slice(0, 20) + "..." : null
      });
      alert("No tienes permisos para agregar videos. Verifica que el usuario sea ADMIN.");
      return;
    }

    if (!resp.ok) {
      const texto = await resp.text();
      console.error("Error agregando video:", resp.status, texto);
      throw new Error(`Error ${resp.status}: ${texto}`);
    }

    input.value = "";
    await cargarBranding();
    await actualizarPreviewVideo();
    alert("Video agregado correctamente.");
  } catch (error) {
    console.error("Error agregando video:", error);
    alert("No se pudo agregar el video.");
  }
}

async function eliminarVideoHome() {
  const slot = document.getElementById("videoSlot")?.value || "hero";

  if (slot === "new") {
    msg("Selecciona un video existente para eliminar", false);
    return;
  }

  if (!confirm("¿Eliminar este video?")) return;

  try {
    const esGaleria = /^gallery\d+$/.test(slot);

    const url = esGaleria
      ? `${getAPI()}/api/branding/gallery-video?slot=${encodeURIComponent(slot)}`
      : `${getAPI()}/api/branding/home-video?slot=${encodeURIComponent(slot)}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders()
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      throw new Error(
        typeof data === "string"
          ? data
          : (data?.message || "No se pudo eliminar el video")
      );
    }

    localStorage.setItem("estampaider_home_refresh", Date.now().toString());
    msg("Video eliminado correctamente");
    await cargarBrandingAdmin();
  } catch (error) {
    console.error(error);
    msg(error.message || "Error eliminando video", false);
  }
}

function resolverUrlVideo(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API}${url}`;
  return `${API}/${url}`;
}

function obtenerVideoPorSlot(slot) {
  if (!slot || !branding) return null;

  if (slot === "hero") {
    return branding.heroMainVideoUrl || null;
  }

  if (slot === "highlight") {
    return branding.highlightVideoUrl || null;
  }

  const galeria = Array.isArray(branding.galleryVideos) ? branding.galleryVideos : [];
  const match = galeria.find(v => v.slot === slot);

  return match?.videoUrl || null;
}

async function actualizarPreviewVideo() {
  const select = document.getElementById("videoSlot");
  const preview = document.getElementById("videoPreview");

  if (!select || !preview) return;

  const slot = select.value;
  const videoUrl = obtenerVideoPorSlot(slot);

  if (!videoUrl) {
    preview.pause();
    preview.removeAttribute("src");
    preview.load();
    return;
  }

  preview.pause();
  preview.src = resolverUrlVideo(videoUrl);
  preview.load();
}

function obtenerVideoPorSlot(slot) {
  if (!slot || !branding) return null;

  if (slot === "hero") {
    return branding.heroMainVideoUrl || null;
  }

  if (slot === "highlight") {
    return branding.highlightVideoUrl || null;
  }

  const galeria = Array.isArray(branding.galleryVideos) ? branding.galleryVideos : [];
  const match = galeria.find(v => v.slot === slot);

  return match?.videoUrl || null;
}

async function actualizarPreviewVideo() {
  const select = document.getElementById("videoSlot");
  const preview = document.getElementById("videoPreview");

  if (!select || !preview) return;

  const slot = select.value;
  const videoUrl = obtenerVideoPorSlot(slot);

  if (!videoUrl) {
    preview.pause();
    preview.removeAttribute("src");
    preview.load();
    return;
  }

  preview.pause();
  preview.src = resolverUrlVideo(videoUrl);
  preview.load();
}

async function guardarRedes() {
  const body = {
    tiktok: document.getElementById("tiktokLink")?.value.trim() || "",
    instagram: document.getElementById("instagramLink")?.value.trim() || "",
    facebook: document.getElementById("facebookLink")?.value.trim() || ""
  };

  try {
    const res = await fetch(`${getAPI()}/api/branding/social-links`, {
      method: "PUT",
      headers: authJsonHeaders(),
      body: JSON.stringify(body)
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      throw new Error(typeof data === "string" ? data : "No se pudieron guardar las redes");
    }

    localStorage.setItem("estampaider_social_refresh", Date.now().toString());
    msg("Redes guardadas correctamente");
  } catch (error) {
    console.error(error);
    msg(error.message || "Error guardando redes", false);
  }
}

async function manejarAgregarNuevo() {
  const selector = document.getElementById("videoSlot");
  if (selector) {
    selector.value = "new";
  }

  limpiarPreviewVideo();
  await agregarVideo();
}

window.cargarBrandingAdmin = cargarBrandingAdmin;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnGuardarHeroBg")
    ?.addEventListener("click", subirHeroBackground);

  document.getElementById("btnGuardarVideo")
    ?.addEventListener("click", subirVideoHome);

  document.getElementById("btnAgregarVideo")
    ?.addEventListener("click", manejarAgregarNuevo);

  document.getElementById("btnEliminarVideo")
    ?.addEventListener("click", eliminarVideoHome);

  document.getElementById("btnGuardarRedes")
    ?.addEventListener("click", guardarRedes);

  document.getElementById("videoSlot")
    ?.addEventListener("change", () => actualizarPreviewVideo());

  cargarBrandingAdmin();
});