const form = document.getElementById("registerForm");
const errorMsg = document.getElementById("error");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const password = document.getElementById("password").value.trim();

    errorMsg.textContent = "";

    try {
        const response = await fetch("http://localhost:8080/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre,
                telefono,
                password
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            errorMsg.textContent = "❌ " + errorText;
            return;
        }

        const data = await response.json();

        sessionStorage.setItem("auth", JSON.stringify({
            rol: data.rol,
            nombre: data.nombre,
            token: data.token
        }));

        window.location.href = "../mi-pedido.html";

    } catch (err) {
        console.error(err);
        errorMsg.textContent = "⚠️ Error de conexión con el servidor";
    }
});
