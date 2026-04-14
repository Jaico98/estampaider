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
      aplicarFondoInicio(API_BASE, data.heroBackgroundUrl || "");
      aplicarVideosInicio(API_BASE, data);
      aplicarRedesSociales(data.socialLinks || {});
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

  function aplicarFondoInicio(API_BASE, fondoUrl) {
    const hero = document.querySelector(".hero, .login-hero-panel, .recovery-brand, .productos-hero, .contacto-hero");
    if (!hero || !fondoUrl) return;

    const url = `${API_BASE}${fondoUrl}?v=${Date.now()}`;
    hero.style.backgroundImage = `linear-gradient(135deg, rgba(15,23,42,.72), rgba(15,23,42,.38)), url("${url}")`;
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
    hero.style.backgroundRepeat = "no-repeat";
    hero.style.borderRadius = "32px";
    hero.style.padding = "42px 32px";
    hero.style.boxShadow = "0 26px 70px rgba(15,23,42,.18)";
    hero.style.marginTop = "12px";
  }

  function setVideoSrc(videoEl, src) {
    if (!videoEl || !src) return;

    const source = videoEl.querySelector("source");
    const finalSrc = `${src}?v=${Date.now()}`;

    if (source) {
      source.src = finalSrc;
    } else {
      videoEl.src = finalSrc;
    }

    videoEl.load();
  }

  function crearVideoCard(url, titulo = "Nuevo video") {
    const card = document.createElement("div");
    card.className = "video-card";

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.title = titulo;

    const source = document.createElement("source");
    source.src = url;
    source.type = "video/mp4";

    video.appendChild(source);
    card.appendChild(video);

    return card;
  }

  function aplicarVideosInicio(API_BASE, data) {
    const heroVideo = document.querySelector(".hero-main-video video");
    const highlightVideo = document.querySelector(".products-highlight video");
    const galleryGrid = document.querySelector(".gallery-grid");
    const galleryVideosActuales = document.querySelectorAll(".gallery-grid .video-card video");

    if (data.heroMainVideoUrl) {
      setVideoSrc(heroVideo, `${API_BASE}${data.heroMainVideoUrl}`);
    }

    if (data.highlightVideoUrl) {
      setVideoSrc(highlightVideo, `${API_BASE}${data.highlightVideoUrl}`);
    }

    if (galleryGrid && Array.isArray(data.galleryVideos)) {
      data.galleryVideos.forEach((item, index) => {
        const videoUrl = item?.url || "";
        if (!videoUrl) return;

        const finalUrl = `${API_BASE}${videoUrl}`;

        if (galleryVideosActuales[index]) {
          setVideoSrc(galleryVideosActuales[index], finalUrl);
        } else {
          const nuevaCard = crearVideoCard(finalUrl, item?.slot || `Video ${index + 1}`);
          galleryGrid.appendChild(nuevaCard);
        }
      });

      if (window.__estampaiderRebindVideoModal) {
        window.__estampaiderRebindVideoModal();
      }
    }
  }

  function aplicarLink(anchor, url) {
    if (!anchor) return;

    if (url) {
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.classList.remove("disabled");
      anchor.removeAttribute("aria-disabled");
      return;
    }

    anchor.href = "#";
    anchor.classList.add("disabled");
    anchor.setAttribute("aria-disabled", "true");
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  }

  function buscarLinkRed(nombre) {
    const anchors = Array.from(document.querySelectorAll("a"));
    const buscado = nombre.toLowerCase();

    return anchors.find((a) => {
      const texto = (a.textContent || "").toLowerCase();
      const data = (a.dataset.socialLink || "").toLowerCase();
      return data === buscado || texto.includes(buscado);
    });
  }

  function aplicarRedesSociales(socialLinks) {
    const tiktok = buscarLinkRed("tiktok");
    const instagram = buscarLinkRed("instagram");
    const facebook = buscarLinkRed("facebook");

    aplicarLink(tiktok, socialLinks.tiktok || "");
    aplicarLink(instagram, socialLinks.instagram || "");
    aplicarLink(facebook, socialLinks.facebook || "");
  }

  function aplicarBrandingGlobal() {
    cargarBrandingActual();
  }

  window.addEventListener("storage", (event) => {
    if (
      event.key === "estampaider_branding_refresh" ||
      event.key === "estampaider_favicon_refresh" ||
      event.key === "estampaider_home_refresh" ||
      event.key === "estampaider_social_refresh"
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