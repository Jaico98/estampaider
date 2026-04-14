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
    video.removeAttribute("src");
    video.load();
  }
  
  function obtenerVideoPorSlot(data, slot) {
    if (!data) return "";
  
    if (slot === "hero") return data.heroMainVideoUrl || "";
    if (slot === "highlight") return data.highlightVideoUrl || "";
  
    const match = slot.match(/^gallery(\d)$/);
    if (!match) return "";
  
    const index = Number(match[1]) - 1;
    if (!Array.isArray(data.galleryVideos)) return "";
    return data.galleryVideos[index] || "";
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
      const actual = obtenerVideoPorSlot(data, slot);
      const preview = document.getElementById("previewVideoActual");
  
      if (!preview) return;
  
      if (actual) {
        preview.src = `${getAPI()}${actual}?v=${Date.now()}`;
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
  
  async function subirVideoHome() {
    const file = document.getElementById("videoFile")?.files?.[0];
    const slot = document.getElementById("videoSlot")?.value || "hero";
  
    if (!file) {
      msg("Selecciona un video", false);
      return;
    }
  
    const fd = new FormData();
    fd.append("file", file);
    fd.append("slot", slot);
  
    try {
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
        throw new Error(typeof data === "string" ? data : "No se pudo guardar el video");
      }
  
      localStorage.setItem("estampaider_home_refresh", Date.now().toString());
      msg("Video reemplazado correctamente");
      await cargarBrandingAdmin();
      document.getElementById("videoFile").value = "";
    } catch (error) {
      console.error(error);
      msg(error.message || "Error reemplazando video", false);
    }
  }
  
  async function agregarVideo() {
    const file = document.getElementById("videoFile")?.files?.[0];
  
    if (!file) {
      msg("Selecciona un video", false);
      return;
    }
  
    try {
      const data = await fetchBrandingCurrent();
  
      let slotLibre = null;
      for (let i = 0; i < 8; i++) {
        if (!data.galleryVideos || !data.galleryVideos[i]) {
          slotLibre = `gallery${i + 1}`;
          break;
        }
      }
  
      if (!slotLibre) {
        msg("No hay espacios libres en la galería", false);
        return;
      }
  
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", slotLibre);
  
      const res = await fetch(`${getAPI()}/api/branding/home-video`, {
        method: "POST",
        headers: authHeaders(),
        body: fd
      });
  
      const contentType = res.headers.get("content-type") || "";
      const responseData = contentType.includes("application/json")
        ? await res.json()
        : await res.text();
  
      if (!res.ok) {
        throw new Error(typeof responseData === "string" ? responseData : "No se pudo agregar el video");
      }
  
      localStorage.setItem("estampaider_home_refresh", Date.now().toString());
      msg(`Video agregado en ${slotLibre}`);
      await cargarBrandingAdmin();
      document.getElementById("videoFile").value = "";
      document.getElementById("videoSlot").value = slotLibre;
    } catch (error) {
      console.error("Error agregando video:", error);
      msg(error.message || "Error agregando video", false);
    }
  }
  
  async function eliminarVideoHome() {
    const slot = document.getElementById("videoSlot")?.value || "hero";
  
    if (!confirm("¿Eliminar este video?")) return;
  
    try {
      const res = await fetch(`${getAPI()}/api/branding/home-video?slot=${encodeURIComponent(slot)}`, {
        method: "DELETE",
        headers: authHeaders()
      });
  
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : await res.text();
  
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : "No se pudo eliminar el video");
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
  
  // Exponer funciones globales porque tu HTML las usa con onclick
  window.cargarBrandingAdmin = cargarBrandingAdmin;
  window.agregarVideo = agregarVideo;
  
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnGuardarHeroBg")
      ?.addEventListener("click", subirHeroBackground);
  
    document.getElementById("btnGuardarVideo")
      ?.addEventListener("click", subirVideoHome);
  
    document.getElementById("btnEliminarVideo")
      ?.addEventListener("click", eliminarVideoHome);
  
    document.getElementById("btnGuardarRedes")
      ?.addEventListener("click", guardarRedes);
  
    document.getElementById("videoSlot")
      ?.addEventListener("change", () => actualizarPreviewVideo());
  
    cargarBrandingAdmin();
  });