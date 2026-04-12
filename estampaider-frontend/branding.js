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

  function aplicarBrandingGlobal() {
    cargarBrandingActual();
  }

  window.addEventListener("storage", (event) => {
    if (
      event.key === "estampaider_branding_refresh" ||
      event.key === "estampaider_favicon_refresh"
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