(function () {
  const BRANDING_CACHE_KEY = "estampaider_branding_cache_v1";
  const BRANDING_VERSION_KEY = "estampaider_branding_version_v1";
  const BRANDING_REFRESH_KEYS = [
    "estampaider_branding_refresh",
    "estampaider_favicon_refresh",
    "estampaider_social_refresh",
    "estampaider_home_refresh"
  ];
  const FRONTEND_BASE_URL = new URL(
    ".",
    document.currentScript?.src || window.location.href
  );
  const VIDEOS_LOCALES = Object.freeze({
    heroMainVideoUrl: new URL("videos/durazno.mp4", FRONTEND_BASE_URL).href,
    highlightVideoUrl: new URL("videos/piscina.mp4", FRONTEND_BASE_URL).href,
    galleryVideos: [
      "cara.mp4",
      "cami.mp4",
      "pocillosdocentes.mp4",
      "claro.mp4",
      "polos.mp4",
      "magicoporta.mp4",
      "carcasa.mp4",
      "navi.mp4",
      "mayor.mp4",
      "oscuro.mp4"
    ].map((archivo, indice) => ({
      slot: `gallery${indice + 1}`,
      url: new URL(`videos/${archivo}`, FRONTEND_BASE_URL).href
    }))
  });
  const TOTAL_VIDEOS_GALERIA_BASE = VIDEOS_LOCALES.galleryVideos.length;

  function resolverApiBaseBranding() {
    if (window.ESTAMPAIDER_CONFIG?.API_BASE) {
      return window.ESTAMPAIDER_CONFIG.API_BASE.replace(/\/$/, "");
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

  function getAPI() {
    return window.ESTAMPAIDER_CONFIG?.API_BASE || "http://localhost:8080";
  }

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  function getBrandingVersion() {
    return localStorage.getItem(BRANDING_VERSION_KEY) || "base";
  }

  function bumpBrandingVersion() {
    localStorage.setItem(BRANDING_VERSION_KEY, String(Date.now()));
  }

  function limpiarCacheBranding() {
    try {
      localStorage.removeItem(BRANDING_CACHE_KEY);
    } catch (_) {}
  }
  
  function leerCacheBranding() {
    try {
      const raw = localStorage.getItem(BRANDING_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  function guardarCacheBranding(data) {
    try {
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  function construirAssetUrl(API_BASE, url) {
    if (!url) return "";

    const version = getBrandingVersion();

    if (/^https?:\/\//i.test(url)) {
      return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
    }

    return `${API_BASE}${url}?v=${version}`;
  }

  async function fetchConTimeout(url, options = {}, timeoutMs = 120000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function obtenerBrandingActual() {
    const API_BASE = resolverApiBaseBranding();

    // La portada no depende de que Render o la base de datos estén despiertos:
    // estos archivos forman parte del frontend publicado en GitHub Pages.
    aplicarVideosInicio(API_BASE, VIDEOS_LOCALES);

    const cache = leerCacheBranding();
    if (cache && !brandingVacio(cache)) {
      aplicarBranding(API_BASE, completarVideosFaltantes(cache));
    }

    try {
      if (typeof window.activarBackend === "function") {
        await window.activarBackend();
      }

      const res = await fetchConTimeout(`${getAPI()}/api/branding/current`, {
        method: "GET",
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error("No se pudo consultar branding");
      }

      const data = await res.json();

      if (brandingVacio(data)) {
        console.info("Branding dinámico vacío; se conservan los recursos locales.");
        return;
      }

      guardarCacheBranding(data);
      aplicarBranding(API_BASE, completarVideosFaltantes(data));
    } catch (error) {
      console.warn("No se pudo cargar branding dinámico:", error);
    }
  }

  function completarVideosFaltantes(data = {}) {
    return {
      ...data,
      heroMainVideoUrl:
        textoSeguro(data.heroMainVideoUrl).trim() || VIDEOS_LOCALES.heroMainVideoUrl,
      highlightVideoUrl:
        textoSeguro(data.highlightVideoUrl).trim() || VIDEOS_LOCALES.highlightVideoUrl,
      galleryVideos: combinarGaleriaBaseConCargas(data.galleryVideos)
    };
  }

  function combinarGaleriaBaseConCargas(videosDinamicos) {
    const resultado = VIDEOS_LOCALES.galleryVideos.map((item) => ({ ...item }));
    const urlsAgregadas = new Set(resultado.map((item) => item.url));
    const slotsAgregados = new Set(resultado.map((item) => item.slot));
    let siguienteIndice = TOTAL_VIDEOS_GALERIA_BASE + 1;

    for (const item of Array.isArray(videosDinamicos) ? videosDinamicos : []) {
      const url = textoSeguro(item?.url).trim();
      if (!url || urlsAgregadas.has(url)) continue;

      let slot = textoSeguro(item?.slot).trim().toLowerCase();
      const indice = obtenerIndiceGaleria(slot);

      // Los diez primeros lugares pertenecen a los videos incluidos con el sitio.
      // Las cargas administrativas se agregan después para no ocultar la galería base.
      if (indice <= TOTAL_VIDEOS_GALERIA_BASE || slotsAgregados.has(slot)) {
        while (slotsAgregados.has(`gallery${siguienteIndice}`)) {
          siguienteIndice++;
        }
        slot = `gallery${siguienteIndice++}`;
      }

      resultado.push({ ...item, slot, url });
      urlsAgregadas.add(url);
      slotsAgregados.add(slot);
    }

    return resultado;
  }

  function aplicarBranding(API_BASE, data) {
    aplicarLogoGlobal(API_BASE, data.logoUrl || "");
    aplicarFaviconGlobal(API_BASE, data.faviconUrl || "");
    aplicarRedesSociales(data.socialLinks || {});
    aplicarFondoGlobal(API_BASE, data.heroBackgroundUrl || "");
    aplicarVideosInicio(API_BASE, data);
  }

  function aplicarLogoGlobal(API_BASE, logoUrl) {
    document.querySelectorAll('img[alt="Estampaider"]').forEach((img) => {
      const fallback = img.getAttribute("src") || "";

      if (logoUrl) {
        img.src = construirAssetUrl(API_BASE, logoUrl);
      } else {
        img.src = fallback;
      }
    });
  }

  function aplicarFaviconGlobal(API_BASE, faviconUrl) {
    const links = document.querySelectorAll('link[rel="icon"]');
    if (!links.length) return;

    const fallbackHref = links[0].getAttribute("href") || "favicon.ico";
    const finalHref = faviconUrl ? construirAssetUrl(API_BASE, faviconUrl) : fallbackHref;

    links.forEach((link) => {
      link.setAttribute("href", finalHref);
    });
  }

  function aplicarLinkSocial(selector, url) {
    document.querySelectorAll(selector).forEach((el) => {
      if (url) {
        el.href = url;
        el.classList.remove("disabled");
        el.removeAttribute("aria-disabled");
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      } else {
        el.href = "#";
        el.classList.add("disabled");
        el.setAttribute("aria-disabled", "true");
        el.removeAttribute("target");
        el.removeAttribute("rel");
      }
    });
  }

  function aplicarRedesSociales(links) {
    aplicarLinkSocial('[data-social="tiktok"]', links.tiktok || "");
    aplicarLinkSocial('[data-social="instagram"]', links.instagram || "");
    aplicarLinkSocial('[data-social="facebook"]', links.facebook || "");
  }

  function brandingVacio(data) {
    if (!data) return true;

    const sinLogo = !textoSeguro(data.logoUrl).trim();
    const sinFavicon = !textoSeguro(data.faviconUrl).trim();
    const sinFondo = !textoSeguro(data.heroBackgroundUrl).trim();
    const sinHeroVideo = !textoSeguro(data.heroMainVideoUrl).trim();
    const sinHighlight = !textoSeguro(data.highlightVideoUrl).trim();
    const sinGaleria = !Array.isArray(data.galleryVideos) || data.galleryVideos.length === 0;

    const redes = data.socialLinks || {};
    const sinRedes =
      !textoSeguro(redes.tiktok).trim() &&
      !textoSeguro(redes.instagram).trim() &&
      !textoSeguro(redes.facebook).trim();

    return (
      sinLogo &&
      sinFavicon &&
      sinFondo &&
      sinHeroVideo &&
      sinHighlight &&
      sinGaleria &&
      sinRedes
    );
  }

  function obtenerIndiceGaleria(slot) {
    const match = String(slot || "").match(/^gallery(\d+)$/);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  }

  function aplicarFondoGlobal(API_BASE, url) {
    if (!url) return;

    const finalUrl = construirAssetUrl(API_BASE, url);

    document.querySelectorAll(`
      .branding-bg,
      .colibri-bg,
      [data-branding-bg],
      [data-colibri-bg]
    `).forEach((el) => {
      el.style.setProperty("--branding-bg-url", `url('${finalUrl}')`);
      el.style.backgroundImage = `
        linear-gradient(rgba(8, 27, 56, 0.68), rgba(8, 27, 56, 0.68)),
        url('${finalUrl}')
      `;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    });
  }

  function aplicarVideosInicio(API_BASE, data) {
    aplicarHeroVideo(API_BASE, data.heroMainVideoUrl || "");
    aplicarHighlightVideo(API_BASE, data.highlightVideoUrl || "");
    aplicarGaleriaVideos(API_BASE, data.galleryVideos || []);
  }

  function aplicarHeroVideo(API_BASE, url) {
    const video = document.getElementById("heroVideo");
    if (!video || !url) return;

    const finalUrl = construirAssetUrl(API_BASE, url);
    if (video.src !== finalUrl) {
      video.src = finalUrl;
      video.load();
    }
  }

  function aplicarHighlightVideo(API_BASE, url) {
    const video = document.getElementById("highlightVideo");
    if (!video || !url) return;

    const finalUrl = construirAssetUrl(API_BASE, url);
    if (video.src !== finalUrl) {
      video.src = finalUrl;
      video.load();
    }
  }

  function aplicarGaleriaVideos(API_BASE, videos) {
    const contenedor = document.querySelector(".gallery-grid");
    if (!contenedor) return;

    const estado = document.getElementById("galleryStatus");

    if (!Array.isArray(videos) || videos.length === 0) {
      if (estado) {
        estado.hidden = contenedor.children.length > 0;
        if (!estado.hidden) {
          estado.textContent = "No fue posible cargar los trabajos destacados en este momento.";
        }
      }
      return;
    }

    contenedor.innerHTML = "";

    const ordenados = [...videos].sort(
      (a, b) => obtenerIndiceGaleria(a?.slot) - obtenerIndiceGaleria(b?.slot)
    );

    ordenados.forEach((item) => {
      if (!item?.url) return;

      const card = document.createElement("div");
      card.className = "video-card";

      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.title = item.slot || "Video de galería";
      video.poster = "images/hero-bg.jpg";
      video.dataset.src = construirAssetUrl(API_BASE, item.url);
      video.addEventListener("error", () => {
        card.hidden = true;
        if (estado && !contenedor.querySelector(".video-card:not([hidden])")) {
          estado.hidden = false;
          estado.textContent = "No fue posible reproducir los trabajos destacados en este momento.";
        }
      });

      card.appendChild(video);
      contenedor.appendChild(card);

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            if (!video.src) video.src = video.dataset.src;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }, { rootMargin: "240px 0px" });
        observer.observe(card);
      } else {
        video.src = video.dataset.src;
      }
    });

    if (estado) estado.hidden = contenedor.children.length > 0;

    if (window.__estampaiderRebindVideoModal) {
      window.__estampaiderRebindVideoModal();
    }
  }

  function aplicarBrandingGlobal() {
    obtenerBrandingActual();
  }

  window.addEventListener("storage", (event) => {
    if (BRANDING_REFRESH_KEYS.includes(event.key)) {
      bumpBrandingVersion();
      limpiarCacheBranding();
      location.reload();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarBrandingGlobal);
  } else {
    aplicarBrandingGlobal();
  }
})();
