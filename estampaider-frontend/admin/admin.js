(function () {
  const authRaw = sessionStorage.getItem("auth");
  const auth = authRaw ? JSON.parse(authRaw) : null;

  if (!auth || !auth.token) {
    window.location.href = "login.html";
    return;
  }

  const nombreEl = document.getElementById("adminNombre");
  if (nombreEl) {
    nombreEl.textContent = auth.nombre || "Administrador";
  }

  window.logout = function logout() {
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("redirectAfterLogin");
    window.location.href = "login.html";
  };

  window.verPanel = function verPanel() {
    window.location.href = "admin.html";
  };

  window.verPedidos = function verPedidos() {
    window.location.href = "../pedidos.html";
  };

  window.verMensajes = function verMensajes() {
    window.location.href = "../mensajes.html";
  };
})();
