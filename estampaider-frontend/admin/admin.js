const auth = JSON.parse(localStorage.getItem("auth"));

if (!auth || !auth.nombre) {
    window.location.href = "login.html";
    throw new Error("No hay sesión activa");
}

document.getElementById("adminNombre").textContent = auth.nombre;

function logout() {
    localStorage.removeItem("auth");
    window.location.href = "login.html";
}

function verPedidos() {
    window.location.href = "/pedidos.html";
}
