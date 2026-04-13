// ============================================================
// contacto.js — Estampaider
// Gestiona el envío del formulario de contacto
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formContacto");
  if (!form) return;

  if (form.dataset.contactoInicializado === "true") {
    return;
  }
  form.dataset.contactoInicializado = "true";

  const API_BASE =
    window.ESTAMPAIDER_CONFIG?.API_BASE ||
    (typeof resolverApiBase === "function"
      ? resolverApiBase()
      : "http://localhost:8080");

  const respuesta = document.getElementById("respuestaContacto");
  const submitBtn =
    form.querySelector('button[type="submit"]') ||
    form.querySelector("button");

  function setRespuesta(texto, tipo = "") {
    if (!respuesta) return;
    respuesta.textContent = texto;
    respuesta.className = tipo
      ? `respuesta-contacto ${tipo}`
      : "respuesta-contacto";
  }

  function setEnviando(enviando) {
    form.dataset.enviando = enviando ? "true" : "false";

    if (submitBtn) {
      submitBtn.disabled = enviando;
      submitBtn.textContent = enviando ? "Enviando..." : "Enviar";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (form.dataset.enviando === "true") {
      return;
    }

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const correo = document.getElementById("correo")?.value.trim() || "";
    const whatsapp = document.getElementById("whatsapp")?.value.trim() || "";
    const mensaje = document.getElementById("mensaje")?.value.trim() || "";

    if (!nombre || !correo || !whatsapp || !mensaje) {
      setRespuesta("⚠️ Por favor completa todos los campos.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      setRespuesta("⚠️ Ingresa un correo electrónico válido.", "error");
      return;
    }

    const telefonoLimpio = whatsapp.replace(/\D/g, "");
    if (telefonoLimpio.length < 10) {
      setRespuesta(
        "⚠️ Ingresa un número de WhatsApp válido (mínimo 10 dígitos).",
        "error"
      );
      return;
    }

    setEnviando(true);
    setRespuesta("⏳ Enviando mensaje...");

    try {
      const res = await fetch(`${API_BASE}/api/mensajes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nombre,
          correo,
          whatsapp,
          mensaje,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error al enviar (${res.status})`);
      }

      setRespuesta(
        "✅ Mensaje enviado correctamente. Te contactaremos pronto.",
        "ok"
      );
      form.reset();
    } catch (err) {
      console.error("Error contacto:", err);
      setRespuesta(
        "❌ Error al enviar el mensaje. Intenta por WhatsApp.",
        "error"
      );
    } finally {
      setEnviando(false);
    }
  });
});
