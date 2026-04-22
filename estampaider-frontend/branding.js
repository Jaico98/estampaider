(function () {
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

  async function fetchConReintento(url, options = {}, intentos = 4, esperaMs = 2500) {
    let ultimoError;
  
    for (let i = 0; i < intentos; i++) {
      try {
        const res = await fetch(url, options);
  
        if (res.ok) {
          return res;
        }
  
        if (res.status === 503 || res.status === 502 || res.status === 504) {
          ultimoError = new Error(`Servicio temporalmente no disponible (${res.status})`);
        } else {
          return res;
        }
      } catch (error) {
        ultimoError = error;
      }
  
      if (i < intentos - 1) {
        await new Promise(resolve => setTimeout(resolve, esperaMs));
      }
    }
  
    throw ultimoError || new Error("No se pudo conectar con el servidor");
  }

  async function cargarBrandingActual() {
    const API_BASE = resolverApiBaseBranding();

    try {
      const res = await fetch(`${getAPI()}/api/branding/current`, {
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

      aplicarLogoGlobal(API_BASE, data.logoUrl || "");
      aplicarFaviconGlobal(API_BASE, data.faviconUrl || "");
      aplicarRedesSociales(data.socialLinks || {});
      aplicarFondoGlobal(API_BASE, data.heroBackgroundUrl || "");
      aplicarVideosInicio(API_BASE, data);
    } catch (error) {
      console.warn("No se pudo cargar branding dinámico:", error);
      setTimeout(() => {
        cargarBrandingActual();
      }, 4000);
    }
  }

  function aplicarLogoGlobal(API_BASE, logoUrl) {
    document.querySelectorAll('img[alt="Estampaider"]').forEach((img) => {
      const fallback = img.getAttribute("src") || "";

      if (logoUrl) {
        img.src = `${API_BASE}${logoUrl}?v=${Date.now()}`;
      } else {
        img.src = fallback;
      }
    });
  }

  function aplicarFaviconGlobal(API_BASE, faviconUrl) {
    const links = document.querySelectorAll('link[rel="icon"]');
    if (!links.length) return;

    const fallbackHref = links[0].getAttribute("href") || "favicon.ico";
    const finalHref = faviconUrl ? `${API_BASE}${faviconUrl}?v=${Date.now()}` : fallbackHref;

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
  
    const finalUrl = /^https?:\/\//i.test(url)
      ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`
      : `${API_BASE}${url}?v=${Date.now()}`;
  
    document.querySelectorAll(`
      .branding-bg,
      .colibri-bg,
      [data-branding-bg],
      [data-colibri-bg]
    `).forEach((el) => {
      el.style.setProperty("--branding-bg-url", `url('${finalUrl}')`);
      el.style.backgroundImage = `
        linear-gradient(rgba(8, 27, 56, 0.45), rgba(8, 27, 56, 0.45)),
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
    if (!video) return;

    if (url) {
      video.src = `${API_BASE}${url}?v=${Date.now()}`;
      video.load();
    }
  }

  function aplicarHighlightVideo(API_BASE, url) {
    const video = document.getElementById("highlightVideo");
    if (!video) return;

    if (url) {
      video.src = `${API_BASE}${url}?v=${Date.now()}`;
      video.load();
    }
  }

  function aplicarGaleriaVideos(API_BASE, videos) {
    const contenedor = document.querySelector(".gallery-grid");
    if (!contenedor) return;

    if (!Array.isArray(videos) || videos.length === 0) {
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
      video.title = item.slot || "Video de galería";
      video.src = `${API_BASE}${item.url}?v=${Date.now()}`;

      card.appendChild(video);
      contenedor.appendChild(card);
    });

    if (window.__estampaiderRebindVideoModal) {
      window.__estampaiderRebindVideoModal();
    }
  }

  function aplicarBrandingGlobal() {
    cargarBrandingActual();
  }

  window.addEventListener("storage", (event) => {
    if (
      event.key === "estampaider_branding_refresh" ||
      event.key === "estampaider_favicon_refresh" ||
      event.key === "estampaider_social_refresh" ||
      event.key === "estampaider_home_refresh"
    ) {
      location.reload();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", aplicarBrandingGlobal);
  } else {
    aplicarBrandingGlobal();
  }
})();