document.addEventListener("DOMContentLoaded", () => {
    const pedidoId = localStorage.getItem("pedidoId");
    const nodoPedido = document.querySelector(".pedido-id, #pedidoId, [data-pedido-id]");
  
    if (nodoPedido && pedidoId) {
      nodoPedido.textContent = `Pedido #${pedidoId}`;
    }
  
    const linkMiPedido = document.querySelector('a[href="mi-pedido.html"]');
    if (linkMiPedido && sessionStorage.getItem("auth")) {
      linkMiPedido.style.display = "inline-flex";
    }
  });