
import { apiRequest } from "./api";

export function obtenerBotones() {
  return apiRequest("/botones");
}

export function crearBoton(datos) {
  return apiRequest("/botones", {
    method: "POST",
    body: JSON.stringify({
      numero: Number(datos.numero),
      habitacion: datos.habitacion.trim(),
      zona: datos.zona.trim(),
    }),
  });
}

export function editarBoton(id_boton, datos) {
  return apiRequest(`/botones/${encodeURIComponent(id_boton)}`, {
    method: "PUT",
    body: JSON.stringify({
      numero: Number(datos.numero),
      habitacion: datos.habitacion.trim(),
      zona: datos.zona.trim(),
    }),
  });
}

export function eliminarBoton(id_boton) {
  return apiRequest(`/botones/${encodeURIComponent(id_boton)}`, {
    method: "DELETE",
  });
}

// Presionar desde una sesión autenticada.
export function presionarBoton(id_boton) {
  return apiRequest(
    `/botones/${encodeURIComponent(id_boton)}/presionar`,
    { method: "POST" }
  );
}

// Verificar por UUID, sin iniciar sesión.
export function verificarBotonPublico(id_boton) {
  return apiRequest(
    `/botones/publico/${encodeURIComponent(id_boton)}`,
    { auth: false }
  );
}

// Presionar por UUID, sin iniciar sesión.
export function presionarBotonPublico(id_boton) {
  return apiRequest(
    `/botones/${encodeURIComponent(id_boton)}/presionar-publico`,
    {
      method: "POST",
      auth: false,
    }
  );
}
