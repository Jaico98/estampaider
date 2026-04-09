document.addEventListener("DOMContentLoaded", () => {

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const contenedor = document.getElementById("carrito");
    const totalSpan = document.getElementById("total");
    const btnWhatsapp = document.getElementById("whatsappCarrito");

    const renderizarCarrito = () => {

        contenedor.innerHTML = "";
        let total = 0;

        if (!Array.isArray(carrito) || carrito.length === 0) {
            contenedor.innerHTML = "<p>El carrito está vacío</p>";
            totalSpan.textContent = "0";

            if (btnWhatsapp) {
                btnWhatsapp.style.display = "none";
            }

            actualizarContadorCarrito();
            return;
        }

        carrito.forEach((item, index) => {

            const precio = Number(item.precio) || 0;
            const cantidad = Number(item.cantidad) || 0;
            const subtotal = precio * cantidad;
            total += subtotal;

            const div = document.createElement("div");
            div.classList.add("item");

            div.innerHTML = `
                <p><strong>${item.nombre}</strong></p>
                <p>
                    Cantidad:
                    <input type="number" min="1" value="${cantidad}" data-index="${index}">
                </p>
                <p>Subtotal: $${subtotal.toLocaleString("es-CO")}</p>
                <button class="eliminar" data-index="${index}">❌ Eliminar</button>
            `;

            contenedor.appendChild(div);
        });

        totalSpan.textContent = total.toLocaleString("es-CO");
        localStorage.setItem("carrito", JSON.stringify(carrito));

        // 🟢 WHATSAPP (PASO 3.3 BIEN HECHO)
        if (btnWhatsapp) {
            let mensaje = "Hola 👋 quiero cotizar estos productos:\n\n";

            carrito.forEach(item => {
                mensaje += `• ${item.nombre} x${item.cantidad} = $${(item.precio * item.cantidad).toLocaleString("es-CO")}\n`;
            });

            mensaje += `\nTotal: $${total.toLocaleString("es-CO")}`;

            btnWhatsapp.href =
                `https://wa.me/573153625992?text=${encodeURIComponent(mensaje)}`;

            btnWhatsapp.style.display = "inline-block";
        }

        actualizarContadorCarrito();
    };

    contenedor.addEventListener("input", e => {
        if (e.target.type === "number") {
            const index = e.target.dataset.index;
            const nuevaCantidad = parseInt(e.target.value);

            if (nuevaCantidad > 0) {
                carrito[index].cantidad = nuevaCantidad;
                renderizarCarrito();
            }
        }
    });

    contenedor.addEventListener("click", e => {
        if (e.target.classList.contains("eliminar")) {
            carrito.splice(e.target.dataset.index, 1);
            renderizarCarrito();
        }
    });

    renderizarCarrito();
});

// 🟢 CONTADOR GLOBAL DEL CARRITO
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const total = carrito.reduce((suma, item) => suma + item.cantidad, 0);

    const contador = document.getElementById("contador-carrito");
    if (contador) contador.textContent = total;
}
