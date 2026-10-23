// Referencias a los elementos del DOM
const zonaDeChat = document.getElementById("zona-de-chat");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Configuración de tiempos para control de peticiones
const TIMEOUT_MS = 10000; // 10 segundos de límite de espera
const COOLDOWN_MS = 2000;  // 2 segundos entre envíos

// Función para agregar un mensaje a la zona de chat
function agregarMensaje(texto, tipo) {
  const mensajeDiv = document.createElement("div");
  mensajeDiv.classList.add("mensaje", tipo);
  mensajeDiv.textContent = texto;
  zonaDeChat.appendChild(mensajeDiv);
  
  // Desplazar el chat hacia el último mensaje
  zonaDeChat.scrollTop = zonaDeChat.scrollHeight;
  return mensajeDiv;
}

// Manejador del evento de envío
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const textoUsuario = userInput.value.trim();
  if (!textoUsuario) return;

  // 1. Mostrar mensaje del usuario en el DOM
  agregarMensaje(textoUsuario, "usuario");
  userInput.value = "";

  // 2. Bloquear controles para evitar envíos múltiples
  sendBtn.disabled = true;
  userInput.disabled = true;

  // 3. Mostrar indicador visual de carga
  const mensajeCargando = agregarMensaje("El Consultor Médico está respondiendo...", "cargando");

  // Configuración del controlador de aborto por tiempo límite
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Petición asíncrona al webhook
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mensaje: textoUsuario }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status}`);
    }

    const data = await response.json();

    // Eliminar indicador de carga
    mensajeCargando.remove();

    // Mostrar respuesta del agente
    const respuestaTexto = data.respuesta || "Respuesta recibida con éxito del consultor.";
    agregarMensaje(respuestaTexto, "bot");

  } catch (error) {
    clearTimeout(timeoutId);
    mensajeCargando.remove();

    if (error.name === "AbortError") {
      agregarMensaje("La solicitud tardó demasiado tiempo. Por favor, reintenta.", "error");
    } else {
      agregarMensaje(`Ocurrió un error al procesar tu mensaje: ${error.message}`, "error");
    }
  } finally {
    // Temporizador de espera (cooldown) antes de rehabilitar el envío
    setTimeout(() => {
      sendBtn.disabled = false;
      userInput.disabled = false;
      userInput.focus();
    }, COOLDOWN_MS);
  }
});
