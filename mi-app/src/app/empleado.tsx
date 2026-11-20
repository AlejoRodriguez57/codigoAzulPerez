
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";

import * as Notifications from "expo-notifications";

import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { obtenerBotones } from "../services/botones";
import { obtenerAlertasActivas } from "../services/alertas";

// Configuración de notificaciones locales cuando la app está abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Boton = {
  id_boton: string;
  numero: number;
  habitacion: string;
  zona: string;
};

type Alerta = {
  id_alerta: string;
  id_boton: string;
  zona: string;
  habitacion: string;
  activo: boolean;
  fecha_inicio: any;
  fecha_final: any;
};

export default function Empleado() {
  const [botones, setBotones] = useState<Boton[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizandoBotones, setActualizandoBotones] = useState(false);

  const alertasAnteriores = useRef<Set<string> | null>(null);
  const consultando = useRef(false);

  // Solicitar permiso para notificaciones en el celular.
  useEffect(() => {
    async function configurarNotificaciones() {
      if (Platform.OS === "web") return;
s
      try {
        const permisos = await Notifications.getPermissionsAsync();

        if (!permisos.granted) {
          await Notifications.requestPermissionsAsync();
        }
      } catch (error) {
        console.error("ERROR CONFIGURANDO NOTIFICACIONES:", error);
      }
    }

    configurarNotificaciones();
  }, []);

  // Mostrar aviso según la plataforma.
  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (Platform.OS === "web") {
      window.alert(`${titulo}\n\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  // Avisar cuando aparece una alerta nueva.
  const notificarNuevaAlerta = async (cantidad: number) => {
    const titulo = "Nueva alerta";
    const mensaje =
      cantidad === 1
        ? "Apareció una nueva alerta en tu zona."
        : `Aparecieron ${cantidad} nuevas alertas en tu zona.`;

    if (Platform.OS === "web") {
      mostrarMensaje(titulo, mensaje);
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("ERROR EN NOTIFICACIÓN LOCAL:", error);
    }

    mostrarMensaje(titulo, mensaje);
  };

  const obtenerBotonDeAlerta = (id_boton: string) => {
  return botones.find((boton) => boton.id_boton === id_boton);
  };

  // Avisar cuando una alerta deja de estar activa.
  const notificarAlertaFinalizada = async (cantidad: number) => {
    const titulo = "Alerta finalizada";
    const mensaje =
      cantidad === 1
        ? "Una alerta de tu zona fue finalizada."
        : `Se finalizaron ${cantidad} alertas de tu zona.`;

    if (Platform.OS === "web") {
      mostrarMensaje(titulo, mensaje);
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("ERROR EN NOTIFICACIÓN LOCAL:", error);
    }

    mostrarMensaje(titulo, mensaje);
  };

  // Cargar botones y alertas.
  const cargarDatos = useCallback(async (notificar = true) => {
    if (consultando.current) return;

    consultando.current = true;

    try {
      const [botonesData, alertasData] = await Promise.all([
        obtenerBotones(),
        obtenerAlertasActivas(),
      ]);

      const botonesRecibidos: Boton[] = Array.isArray(botonesData)
        ? botonesData
        : [];

      const alertasRecibidas: Alerta[] = Array.isArray(alertasData)
        ? alertasData.filter(
            (a: Alerta) =>
              a.activo === true &&
              a.fecha_final == null
          )
        : [];

      const idsActuales = new Set(
        alertasRecibidas.map((a) => a.id_alerta)
      );

      // Comparar las alertas recibidas con las anteriores.
      if (notificar && alertasAnteriores.current !== null) {
        const anteriores = alertasAnteriores.current;

        const nuevas = [...idsActuales].filter(
          (id) => !anteriores.has(id)
        );

        const finalizadas = [...anteriores].filter(
          (id) => !idsActuales.has(id)
        );

        if (nuevas.length > 0) {
          await notificarNuevaAlerta(nuevas.length);
        }

        if (finalizadas.length > 0) {
          await notificarAlertaFinalizada(finalizadas.length);
        }
      }

      alertasAnteriores.current = idsActuales;

      setBotones(botonesRecibidos);
      setAlertas(alertasRecibidas);

    } catch (error: any) {
      console.error("ERROR CARGANDO PANEL EMPLEADO:", error);

      mostrarMensaje(
        "Error",
        error.message || "No se pudieron actualizar los datos."
      );
    } finally {
      setCargando(false);
      consultando.current = false;
    }
  }, []);

  // Actualizar solamente los botones desde el botón manual.
  const actualizarBotones = async () => {
    try {
      setActualizandoBotones(true);

      const respuesta = await obtenerBotones();

      setBotones(Array.isArray(respuesta) ? respuesta : []);

    } catch (error: any) {
      mostrarMensaje(
        "Error",
        error.message || "No se pudieron actualizar los botones."
      );
    } finally {
      setActualizandoBotones(false);
    }
  };

  // Primera carga y actualización automática cada 5 segundos.
  useEffect(() => {
    cargarDatos(false);

    const intervalo = setInterval(() => {
      cargarDatos(true);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [cargarDatos]);

  async function cerrarSesion() {
    try {
      await signOut(auth);
      router.replace("/");
    } catch {
      mostrarMensaje("Error", "No se pudo cerrar la sesión.");
    }
  }

  function fechaLegible(fecha: any) {
    if (!fecha) return "Sin fecha";

    const date = fecha.seconds
      ? new Date(fecha.seconds * 1000)
      : fecha.toDate
        ? fecha.toDate()
        : new Date(fecha);

    return date.toLocaleString();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Panel empleado</Text>
          <Text style={styles.subtitle}>
            Alertas de tu zona
          </Text>
        </View>

        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Alertas activas ({alertas.length})
      </Text>

      {cargando ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id_alerta}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => cargarDatos(true)}
            />
          }
          renderItem={({ item }) => {
            const boton = obtenerBotonDeAlerta(item.id_boton);

            return (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>
                  ALERTA ACTIVA
                </Text>

                <Text>Botón: {boton?.numero ?? "—"}</Text>
                <Text>Zona: {boton?.zona ?? "—"}</Text>
                <Text>Habitación: {boton?.habitacion ?? "—"}</Text>

                <Text>
                  Inicio: {fechaLegible(item.fecha_inicio)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No hay alertas activas en tu zona.
            </Text>
          }
        />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Botones de tu zona ({botones.length})
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={actualizarBotones}
          disabled={actualizandoBotones}
        >
          {actualizandoBotones ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.refreshText}>
              Actualizar ahora
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={botones}
        keyExtractor={(item) => item.id_boton}
        renderItem={({ item }) => (
          <View style={styles.buttonCard}>
            <Text style={styles.buttonTitle}>
              Botón {item.numero}
            </Text>

            <Text>Habitación: {item.habitacion}</Text>
            <Text>Zona: {item.zona}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No hay botones registrados en tu zona.
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.configureButton}
        onPress={() => router.push("/boton")}
      >
        <Text style={styles.configureText}>
          Configurar un botón
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    paddingTop: 55,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 27,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
  logout: {
    color: "#c62828",
    fontWeight: "bold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: "#ddd",
    padding: 10,
    borderRadius: 8,
  },
  refreshText: {
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 10,
  },
  alertCard: {
    backgroundColor: "#fff",
    borderLeftWidth: 5,
    borderLeftColor: "#c62828",
    padding: 14,
    borderRadius: 9,
    marginBottom: 9,
  },
  alertTitle: {
    color: "#c62828",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
  },
  buttonCard: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 9,
    marginBottom: 8,
  },
  buttonTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  empty: {
    color: "#777",
    padding: 12,
  },
  configureButton: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 10,
  },
  configureText: {
    color: "white",
    fontWeight: "bold",
  },
});
