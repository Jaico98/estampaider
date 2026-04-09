const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("error");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    errorMsg.textContent = "";

    try {
        const response = await fetch("http://localhost:8080/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, password })
        });

        if (!response.ok) {
            errorMsg.textContent = "❌ Credenciales incorrectas";
            return;
        }

        const data = await response.json();

        sessionStorage.setItem("auth", JSON.stringify({
            ok: data.ok,
            rol: data.rol,
            nombre: data.nombre,
            telefono: data.telefono,
            token: data.token
        }));

        const redirect = sessionStorage.getItem("redirectAfterLogin");

        if (redirect) {
            sessionStorage.removeItem("redirectAfterLogin");
            window.location.href = redirect;
            return;
        }

        if (data.rol === "ADMIN") {
            window.location.href = "../pedidos.html";
        } else {
            window.location.href = "../mi-pedido.html";
        }

    } catch (err) {
        console.error(err);
        errorMsg.textContent = "⚠️ Error de conexión con el servidor";
    }
});