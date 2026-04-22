document.addEventListener("DOMContentLoaded", () => {
    actualizarContadorCarrito();
  });
  
  function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const total = carrito.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
  
    const contador = document.getElementById("contador-carrito");
    if (!contador) return;
  
    contador.textContent = total;
  
    if (total === 0) {
      contador.style.display = "none";
    } else {
      contador.style.display = "inline-flex";
    }
  
    contador.classList.remove("pop");
    void contador.offsetWidth;
    contador.classList.add("pop");
  }
  
  function mostrarToastGlobal(mensaje) {
    const toast = document.getElementById("toast-global");
    if (!toast) return;
  
    toast.textContent = String(mensaje ?? "");
    toast.classList.add("show");
  
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }
