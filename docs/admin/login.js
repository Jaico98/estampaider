const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("error");
const submitButton = form?.querySelector('button[type="submit"]');

const API_BASE =
  window.ESTAMPAIDER_CONFIG?.API_BASE ||
  (typeof resolverApiBase === "function"
    ? resolverApiBase()
    : "https://estampaider.onrender.com");

const AUTH_TIMEOUT_MS = 30000;
const SUBMIT_TEXT = submitButton?.textContent || "Ingresar";

function mostrarMensaje(texto, cargando = false) {
  if (!errorMsg) return;
  errorMsg.textContent = texto;
  errorMsg.classList.toggle("loading", cargando);
}

function cambiarEstadoEnvio(cargando, texto = SUBMIT_TEXT) {
  if (!submitButton) return;
  submitButton.disabled = cargando;
  submitButton.textContent = texto;
  submitButton.setAttribute("aria-busy", cargando ? "true" : "false");
}

async function esperarBackend() {
  if (typeof window.activarBackend !== "function") return;

  mostrarMensaje("⏳ Activando el servidor; esto solo puede tardar en la primera entrada…", true);
  const disponible = await window.activarBackend();
  if (!disponible) throw new Error("BACKEND_NO_DISPONIBLE");
}

async function enviarAutenticacion(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    mostrarMensaje("");

    if (!usuario || !password) {
      mostrarMensaje("⚠️ Ingresa usuario y contraseña");
      return;
    }

    let redireccionando = false;
    cambiarEstadoEnvio(true, "Conectando…");

    try {
      await esperarBackend();
      mostrarMensaje("⏳ Verificando credenciales…", true);
      cambiarEstadoEnvio(true, "Verificando…");

      const response = await enviarAutenticacion(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ usuario, password })
      });

      if (!response.ok) {
        const detalle = await response.text();
        mostrarMensaje(`❌ ${detalle || "Error de autenticación"}`);
        return;
      }

      const data = await response.json();

      const authGuardado = JSON.stringify({
        ok: data.ok,
        rol: data.rol,
        nombre: data.nombre,
        correo: data.correo,
        telefono: data.telefono,
        token: data.token
      });

      sessionStorage.setItem("auth", authGuardado);
      localStorage.setItem("auth", authGuardado);

      const redirect =
        sessionStorage.getItem("redirectAfterLogin") ||
        localStorage.getItem("redirectAfterLogin");

      redireccionando = true;
      cambiarEstadoEnvio(true, "Acceso correcto…");

      if (redirect) {
        sessionStorage.removeItem("redirectAfterLogin");
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirect;
        return;
      }

      window.location.href = data.rol === "ADMIN"
        ? "../pedidos.html"
        : "../mi-pedido.html";
    } catch (error) {
      console.error("Error login:", error);
      const mensaje = error?.name === "AbortError"
        ? "⚠️ El servidor tardó demasiado en responder. Intenta nuevamente."
        : "⚠️ No fue posible conectar con el servidor. Intenta nuevamente.";
      mostrarMensaje(mensaje);
    } finally {
      if (!redireccionando) cambiarEstadoEnvio(false);
    }
  });
}
