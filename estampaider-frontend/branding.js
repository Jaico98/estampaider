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

  async function cargarBrandingActual() {
    const API_BASE = resolverApiBaseBranding();

    try {
      const res = await fetch(`${API_BASE}/api/branding/current`, {
        method: "GET",
        cache: "no-store"
      });

      if (!res.ok) {
        throw new Error("No se pudo consultar branding");
      }

      const data = await res.json();
      
      aplicarLogoGlobal(API_BASE, data.logoUrl || "");
      aplicarFaviconGlobal(API_BASE, data.faviconUrl || "");
      aplicarRedesSociales(data.socialLinks || {});
      aplicarFondoGlobal(API_BASE, data.heroBackgroundUrl || "");
      aplicarVideosInicio(API_BASE, data);
    } catch (error) {
      console.warn("No se pudo cargar branding dinámico:", error);
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