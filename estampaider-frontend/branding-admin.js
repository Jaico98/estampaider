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
function actualizarProgreso(porcentaje) {
  const el = document.getElementById("progresoSubida");
  if (!el) return;

  if (porcentaje >= 100) {
    el.textContent = "Procesando video...";
  } else {
    el.textContent = `Subiendo video... ${porcentaje}%`;
  }
}

function limpiarProgreso() {
  const el = document.getElementById("progresoSubida");
  if (!el) return;
  el.textContent = "";
}

function subirConProgreso(url, formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url);

    const headers = authHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const porcentaje = Math.round((event.loaded / event.total) * 100);
        actualizarProgreso(porcentaje);
      }
    };

    xhr.onload = () => {
      actualizarProgreso(100);

      const responseText = xhr.responseText || "";
      const contentType = xhr.getResponseHeader("content-type") || "";

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          if (contentType.includes("application/json")) {
            resolve(JSON.parse(responseText));
          } else {
            resolve(responseText);
          }
        } catch {
          resolve(responseText);
        }
      } else {
        reject(new Error(responseText || "Error al subir video"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Error de red al subir video"));
    };

    xhr.send(formData);
  });
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

  const maxIndiceExistente = indices.length ? Math.max(...indices) : 0;
  const siguienteLibre = obtenerIndiceGaleriaDesdeSlot(obtenerPrimerSlotLibre(data)) || 1;
  const totalMostrar = Math.max(maxIndiceExistente, siguienteLibre, 8);

  const opcionNuevo = selector.querySelector('option[value="new"]');

  for (let i = 1; i <= totalMostrar; i++) {
    const value = `gallery${i}`;

    if (!selector.querySelector(`option[value="${value}"]`)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = `Galería ${i}`;
      option.setAttribute("data-gallery-dinamica", "true");

      if (opcionNuevo) {
        selector.appendChild(option);
      } else {
        selector.appendChild(option);
      }
    }
  }

  selector.value = valorActual || "hero";
}

async function cargarBrandingAdmin() {
  try {
    const data = await fetchBrandingCurrent();

    const bg = document.getElementById("previewHeroBg");
    if (bg) {
      if (data.heroBackgroundUrl) {
        bg.src = `${resolverAssetUrl(data.heroBackgroundUrl)}?v=${Date.now()}`;
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

    if (actual) {
      preview.src = `${resolverAssetUrl(actual)}?v=${Date.now()}`;
      preview.load();
    } else {
      limpiarPreviewVideo();
    }
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

async function subirVideoHome(e) {
  e?.preventDefault?.();

  const file = document.getElementById("videoFile")?.files?.[0];
  const slot = document.getElementById("videoSlot")?.value || "hero";

  if (!file) {
    msg("Selecciona un video", false);
    return;
  }

  try {
    limpiarProgreso();

    if (slot === "new") {
      await agregarVideo();
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", slot);

    const esGaleria = /^gallery\d+$/.test(slot);

    const url = esGaleria
      ? `${getAPI()}/api/branding/gallery-video`
      : `${getAPI()}/api/branding/home-video`;

    const data = await subirConProgreso(url, fd);

    const mensaje =
      typeof data === "string"
        ? data
        : (data?.message || data?.error || "");

    if (mensaje && /error|no se pudo|forbidden|unauthorized/i.test(mensaje)) {
      throw new Error(mensaje);
    }

    localStorage.setItem("estampaider_home_refresh", Date.now().toString());
    msg(`Video guardado correctamente en ${slot}`);
    await cargarBrandingAdmin();
    document.getElementById("videoFile").value = "";

    setTimeout(() => {
      limpiarProgreso();
    }, 2000);
  } catch (error) {
    console.error(error);
    msg(error.message || "Error guardando video", false);
    limpiarProgreso();
  }
}

function resolverAssetUrl(url) {
  const valor = String(url || "").trim();
  if (!valor) return "";

  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    return valor;
  }

  return `${getAPI()}${valor}`;
}

async function agregarVideo(e) {
  e?.preventDefault?.();

  const file = document.getElementById("videoFile")?.files?.[0];
  if (!file) {
    msg("Selecciona un video", false);
    return;
  }

  try {
    limpiarProgreso();

    const dataActual = await fetchBrandingCurrent();
    const slotLibre = obtenerPrimerSlotLibre(dataActual);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", slotLibre);

    const responseData = await subirConProgreso(
      `${getAPI()}/api/branding/gallery-video`,
      fd
    );

    const mensaje =
      typeof responseData === "string"
        ? responseData
        : (responseData?.message || responseData?.error || "");

    if (mensaje && /error|no se pudo|forbidden|unauthorized/i.test(mensaje)) {
      throw new Error(mensaje);
    }

    const slotAsignado = responseData?.slot || slotLibre;

    localStorage.setItem("estampaider_home_refresh", Date.now().toString());
    msg(`Video agregado en ${slotAsignado}`);
    await cargarBrandingAdmin();

    document.getElementById("videoFile").value = "";

    const selector = document.getElementById("videoSlot");
    if (selector) {
      selector.value = slotAsignado;
    }

    await actualizarPreviewVideo();

    setTimeout(() => {
      limpiarProgreso();
    }, 2000);
  } catch (error) {
    console.error("Error agregando video:", error);
    msg(error.message || "Error agregando video", false);
    limpiarProgreso();
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

async function manejarAgregarNuevo(e) {
  e?.preventDefault?.();

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