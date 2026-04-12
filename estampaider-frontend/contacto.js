// ============================================================
// contacto.js — Estampaider
// Gestiona el envío del formulario de contacto
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formContacto");
    if (!form) return;
  
    const API_BASE =
      window.ESTAMPAIDER_CONFIG?.API_BASE ||
      (typeof resolverApiBase === "function" ? resolverApiBase() : "http://localhost:8080");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const respuesta = document.getElementById("respuestaContacto");
      const nombre = document.getElementById("nombre")?.value.trim() || "";
      const correo = document.getElementById("correo")?.value.trim() || "";
      const whatsapp = document.getElementById("whatsapp")?.value.trim() || "";
      const mensaje = document.getElementById("mensaje")?.value.trim() || "";
  
      if (!nombre || !correo || !whatsapp || !mensaje) {
        respuesta.textContent = "⚠️ Por favor completa todos los campos.";
        respuesta.className = "respuesta-contacto error";
        return;
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        respuesta.textContent = "⚠️ Ingresa un correo electrónico válido.";
        respuesta.className = "respuesta-contacto error";
        return;
      }
  
      const telefonoLimpio = whatsapp.replace(/\D/g, "");
      if (telefonoLimpio.length < 10) {
        respuesta.textContent = "⚠️ Ingresa un número de WhatsApp válido (mínimo 10 dígitos).";
        respuesta.className = "respuesta-contacto error";
        return;
      }
  
      respuesta.textContent = "⏳ Enviando mensaje...";
      respuesta.className = "respuesta-contacto";
  
      try {
        const res = await fetch(`${API_BASE}/api/mensajes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            nombre,
            correo,
            whatsapp,
            mensaje
          })
        });
  
        if (!res.ok) {
          throw new Error("Error al enviar");
        }
  
        respuesta.textContent = "✅ Mensaje enviado correctamente. Te contactaremos pronto.";
        respuesta.className = "respuesta-contacto ok";
        form.reset();
      } catch (err) {
        console.error("Error contacto:", err);
        respuesta.textContent = "❌ Error al enviar el mensaje. Intenta por WhatsApp.";
        respuesta.className = "respuesta-contacto error";
      }
    });
  });
