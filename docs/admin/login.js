const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("error");

const API_BASE =
  window.ESTAMPAIDER_CONFIG?.API_BASE ||
  (typeof resolverApiBase === "function"
    ? resolverApiBase()
    : "https://estampaider.onrender.com");

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
        const detalle = await response.text();
        errorMsg.textContent = `❌ ${detalle || "Error de autenticación"}`;
        return;
      }
      const data = await response.json();

      const authGuardado = JSON.stringify({
        ok: data.ok,
        rol: data.rol,
        nombre: data.nombre,
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