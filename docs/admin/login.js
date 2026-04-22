const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("error");

function resolverApiBase() {
  if (window.ESTAMPAIDER_CONFIG?.API_BASE) {
    return window.ESTAMPAIDER_CONFIG.API_BASE.replace(/\/$/, "");
  }

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
const API_BASE = resolverApiBase();

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario")?.value.trim() || "";
    const password = document.getElementById("password")?.value.trim() || "";

    errorMsg.textContent = "";

    if (!usuario || !password) {
      errorMsg.textContent = "⚠️ Ingresa usuario y contraseña";
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ usuario, password })
      });

      if (!response.ok) {
        errorMsg.textContent = "❌ Credenciales incorrectas";
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
      if (redirect) {
        sessionStorage.removeItem("redirectAfterLogin");
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirect;
  return;
}

      if (data.rol === "ADMIN") {
        window.location.href = "../pedidos.html";
      } else {
        window.location.href = "../mi-pedido.html";
      }
    } catch (err) {
      console.error("Error login:", err);
      errorMsg.textContent = "⚠️ Error de conexión con el servidor";
    }
  });
}