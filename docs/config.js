(function () {
  function resolverApiBase() {
    const configurada = window.API_BASE_URL || window.__API_BASE__;
    if (configurada) {
      return String(configurada).replace(/\/$/, "");
    }

    const { protocol, hostname, port } = window.location;

    if (protocol === "file:") {
      return "http://localhost:8080";
    }

    const esLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (esLocal && port && port !== "8080") {
      return `${protocol}//${hostname}:8080`;
    }

    return "https://TU-BACKEND-EN-RENDER.onrender.com";
  }

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  window.ESTAMPAIDER_CONFIG = Object.freeze({
    API_BASE: resolverApiBase(),
    WHATSAPP_NUMBER: "573153625992"
  });

  window.resolverApiBase = resolverApiBase;
  window.textoSeguro = textoSeguro;
})();
