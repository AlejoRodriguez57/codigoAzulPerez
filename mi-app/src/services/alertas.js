import { apiRequest } from "./api";

// GET /alertas (solo administrador; incluye historial)
export function obtenerAlertas() {
    return apiRequest("/alertas");
}

// GET /alertas/empleado/zona
// Devuelve las alertas activas de la zona del usuario.
// Para administrador, todas=true devuelve todas las alertas activas.
export function obtenerAlertasActivas(todas = false) {
    const query = todas ? "?todas=true" : "";
    return apiRequest(`/alertas/empleado/zona${query}`);
}

// GET /alertas/:id
export function obtenerAlerta(id_alerta) {
    return apiRequest(`/alertas/${encodeURIComponent(id_alerta)}`);
}

// POST /alertas (solo administrador)
export function crearAlerta(id_boton) {
    return apiRequest("/alertas", {
        method: "POST",
        body: JSON.stringify({
            id_boton,
        }),
    });
}

// PUT /alertas/:id (solo administrador; según las reglas del backend,
// permite editar alertas finalizadas)
export function editarAlerta(id_alerta, id_boton) {
    return apiRequest(`/alertas/${encodeURIComponent(id_alerta)}`, {
        method: "PUT",
        body: JSON.stringify({
            id_boton,
        }),
    });
}

// PUT /alertas/:id/finalizar
// Administrador o empleado de la misma zona.
export function finalizarAlerta(id_alerta) {
    return apiRequest(
        `/alertas/${encodeURIComponent(id_alerta)}/finalizar`,
        {
            method: "PUT",
        }
    );
}

// DELETE /alertas/:id (solo administrador; alertas finalizadas)
export function eliminarAlerta(id_alerta) {
    return apiRequest(`/alertas/${encodeURIComponent(id_alerta)}`, {
        method: "DELETE",
    });
}
