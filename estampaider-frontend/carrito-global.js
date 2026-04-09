document.addEventListener("DOMContentLoaded", () => {
    actualizarContadorCarrito();
});

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const total = carrito.reduce((suma, item) => suma + (item.cantidad || 0), 0);

    const contador = document.getElementById("contador-carrito");
    if (!contador) return;

    contador.textContent = total;

    // 🔥 ocultar si está en 0
    if (total === 0) {
        contador.style.display = "none";
    } else {
        contador.style.display = "inline-flex";
    }

    // 🎯 animación pop
    contador.classList.remove("pop");
    void contador.offsetWidth; // fuerza reflow
    contador.classList.add("pop");
}

function mostrarToastGlobal(mensaje) {
    const toast = document.getElementById("toast-global");
    if (!toast) return;

    toast.textContent = mensaje;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}
