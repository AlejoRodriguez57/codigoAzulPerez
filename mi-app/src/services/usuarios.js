
import { apiRequest } from "./api";

export function obtenerUsuarios() {
  return apiRequest("/usuarios");
}

export function obtenerMiUsuario() {
  return apiRequest("/usuarios/me");
}

export function obtenerUsuario(id_usuario) {
  return apiRequest(`/usuarios/${encodeURIComponent(id_usuario)}`);
}

// Crear perfil del usuario autenticado.
export function crearUsuario(datos) {
  return apiRequest("/usuarios/registro", {
    method: "POST",
    auth: false,
    body: JSON.stringify(datos),
  });
}
export function editarUsuario(id_usuario, datos) {
  return apiRequest(`/usuarios/${encodeURIComponent(id_usuario)}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarUsuario(id_usuario) {
  return apiRequest(`/usuarios/${encodeURIComponent(id_usuario)}`, {
    method: "DELETE",
  });
}
