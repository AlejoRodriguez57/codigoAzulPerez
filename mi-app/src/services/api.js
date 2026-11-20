
import { auth } from "./firebase";

const API_URL = "http://192.168.1.38:3000";

export async function apiRequest(endpoint, options = {}) {
  if (!API_URL) {
    throw new Error(
      "Falta configurar EXPO_PUBLIC_API_URL en el archivo .env"
    );
  }

  const {
    auth: requiereAutenticacion = true,
    ...fetchOptions
  } = options;

  const token = requiereAutenticacion
    ? await auth.currentUser?.getIdToken()
    : null;

  if (requiereAutenticacion && !token) {
    throw new Error("No hay una sesión autenticada en Firebase.");
  }

  const headers = {
    ...fetchOptions.headers,
  };

  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const texto = await respuesta.text();

  let data = null;

  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = texto;
  }

  if (!respuesta.ok) {
    throw new Error(
      data?.error ||
      data?.mensaje ||
      `Error del servidor: ${respuesta.status}`
    );
  }

  return data;
}
