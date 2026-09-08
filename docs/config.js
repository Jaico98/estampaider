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

    return "https://estampaider.onrender.com";
  }

  function textoSeguro(valor) {
    return String(valor ?? "");
  }

  const API_BASE = resolverApiBase();
  const BACKEND_WAKE_TIMEOUT_MS = 120000;
  let backendWakePromise = null;

  function reescribirApiUrl(input) {
    try {
      const valor = typeof input === "string" ? input : String(input);

      if (valor.startsWith("/api/")) {
        return `${API_BASE}${valor}`;
      }

      if (valor.startsWith("http://localhost:8080/api/")) {
        return `${API_BASE}${valor.substring("http://localhost:8080".length)}`;
      }

      if (valor.startsWith("http://127.0.0.1:8080/api/")) {
        return `${API_BASE}${valor.substring("http://127.0.0.1:8080".length)}`;
      }

      const url = new URL(valor, window.location.href);

      const esMismoFrontend = url.origin === window.location.origin;
      const esApi = url.pathname.startsWith("/api/");

      if (esMismoFrontend && esApi) {
        return `${API_BASE}${url.pathname}${url.search}${url.hash}`;
      }

      return valor;
    } catch (_) {
      return input;
    }
  }

  const fetchOriginal = window.fetch.bind(window);

  window.fetch = function (input, init) {
    if (typeof input === "string" || input instanceof URL) {
      return fetchOriginal(reescribirApiUrl(input), init);
    }

    if (input instanceof Request) {
      const nuevaUrl = reescribirApiUrl(input.url);

      if (nuevaUrl !== input.url) {
        const nuevoRequest = new Request(nuevaUrl, input);
        return fetchOriginal(nuevoRequest, init);
      }
    }

    return fetchOriginal(input, init);
  };

  function activarBackend() {
    if (backendWakePromise) {
      return backendWakePromise;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_WAKE_TIMEOUT_MS);

    backendWakePromise = fetchOriginal(`${API_BASE}/api/hello`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`El backend respondió ${response.status}`);
        }

        return true;
      })
      .catch((error) => {
        console.warn("No se pudo activar el backend anticipadamente:", error);
        backendWakePromise = null;
        return false;
      })
      .finally(() => clearTimeout(timeout));

    return backendWakePromise;
  }

  window.ESTAMPAIDER_CONFIG = Object.freeze({
    API_BASE,
    WHATSAPP_NUMBER: "573153625992",
    BACKEND_WAKE_TIMEOUT_MS
  });

  window.resolverApiBase = resolverApiBase;
  window.textoSeguro = textoSeguro;
  window.activarBackend = activarBackend;

  // Render puede suspender el servicio por inactividad. Esta llamada comienza
  // a reactivarlo desde que se abre cualquier página, antes de autenticar.
  activarBackend();
})();
