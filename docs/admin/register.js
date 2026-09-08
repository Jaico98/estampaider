const form = document.getElementById("registerForm");
const errorMsg = document.getElementById("error");
const submitButton = form?.querySelector('button[type="submit"]');

const API_BASE =
  window.ESTAMPAIDER_CONFIG?.API_BASE ||
  (typeof resolverApiBase === "function"
    ? resolverApiBase()
    : "https://estampaider.onrender.com");
const AUTH_TIMEOUT_MS = 30000;
const SUBMIT_TEXT = submitButton?.textContent || "Registrarme";

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

  mostrarMensaje("⏳ Activando el servidor; esto solo puede tardar en el primer acceso…", true);
  const disponible = await window.activarBackend();
  if (!disponible) throw new Error("BACKEND_NO_DISPONIBLE");
}

async function enviarRegistro(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const password = document.getElementById("password").value;

  mostrarMensaje("");
  let redireccionando = false;
  cambiarEstadoEnvio(true, "Conectando…");

  try {
    await esperarBackend();
    mostrarMensaje("⏳ Creando tu cuenta…", true);
    cambiarEstadoEnvio(true, "Registrando…");

    const response = await enviarRegistro(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        nombre,
        telefono,
        correo,
        password
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      mostrarMensaje("❌ " + (errorText || "No fue posible crear la cuenta"));
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

    redireccionando = true;
    cambiarEstadoEnvio(true, "Cuenta creada…");
    window.location.href = "../mi-pedido.html";
  } catch (error) {
    console.error("Error registro:", error);
    const mensaje = error?.name === "AbortError"
      ? "⚠️ El servidor tardó demasiado en responder. Intenta nuevamente."
      : "⚠️ No fue posible conectar con el servidor. Intenta nuevamente.";
    mostrarMensaje(mensaje);
  } finally {
    if (!redireccionando) cambiarEstadoEnvio(false);
  }
});
