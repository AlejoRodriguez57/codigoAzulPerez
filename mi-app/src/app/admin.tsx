import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";

import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

import {
  obtenerUsuarios,
  editarUsuario,
  eliminarUsuario,
} from "../services/usuarios";

import {
  obtenerBotones,
  crearBoton,
  editarBoton,
  eliminarBoton,
} from "../services/botones";

import {
  obtenerAlertas,
  crearAlerta,
  editarAlerta,
  eliminarAlerta,
  finalizarAlerta,
} from "../services/alertas";

type Seccion = "botones" | "usuarios" | "alertas";

export default function Admin() {
  const [seccion, setSeccion] = useState<Seccion>("botones");
  const [registros, setRegistros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<any>(null);

  const [campo1, setCampo1] = useState("");
  const [campo2, setCampo2] = useState("");
  const [campo3, setCampo3] = useState("");
  const [campo4, setCampo4] = useState("");
  const [campo5, setCampo5] = useState("");

  const [guardando, setGuardando] = useState(false);

  const cargarRegistros = useCallback(async () => {
    try {
      setCargando(true);

      let respuesta;

      if (seccion === "botones") {
        respuesta = await obtenerBotones();
      } else if (seccion === "usuarios") {
        respuesta = await obtenerUsuarios();
      } else {
        respuesta = await obtenerAlertas();
      }

      setRegistros(Array.isArray(respuesta) ? respuesta : []);

    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar los registros."
      );
    } finally {
      setCargando(false);
    }
  }, [seccion]);

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  function abrirNuevo() {
    setEditando(null);
    setCampo1("");
    setCampo2("");
    setCampo3("");
    setCampo4("");
    setCampo5("");
    setModalVisible(true);
  }

  function abrirEdicion(item: any) {
    setEditando(item);

    if (seccion === "botones") {
      setCampo1(String(item.numero ?? ""));
      setCampo2(String(item.habitacion ?? ""));
      setCampo3(String(item.zona ?? ""));
    }

    if (seccion === "usuarios") {
      setCampo1(String(item.nombre ?? ""));
      setCampo2(String(item.email ?? ""));
      setCampo3(String(item.telefono ?? ""));
      setCampo4(String(item.zona ?? ""));
      setCampo5(String(item.rol ?? "empleado"));
    }

    if (seccion === "alertas") {
      setCampo1(String(item.id_boton ?? ""));
      setCampo2(String(item.zona ?? ""));
    }

    setModalVisible(true);
  }

  async function guardar() {
    try {
      setGuardando(true);

      if (seccion === "botones") {
        if (!campo1.trim() || !campo2.trim() || !campo3.trim()) {
          Alert.alert("Error", "Completá todos los campos.");
          return;
        }

        const datos = {
          numero: Number(campo1),
          habitacion: campo2.trim(),
          zona: campo3.trim(),
        };

        if (!Number.isFinite(datos.numero)) {
          Alert.alert("Error", "El número del botón no es válido.");
          return;
        }

        if (editando) {
          await editarBoton(editando.id_boton, datos);
        } else {
          await crearBoton(datos);
        }
      }

      if (seccion === "usuarios") {
        if (!editando) {
          Alert.alert(
            "No disponible",
            "Para crear usuarios desde el administrador falta implementar una ruta que cree también la cuenta en Firebase Authentication."
          );
          return;
        }

        const id = editando.id_usuario || editando.id || editando.uid;

        await editarUsuario(id, {
          nombre: campo1.trim(),
          email: campo2.trim(),
          telefono: campo3.trim(),
          zona: campo4.trim(),
          rol: campo5.trim(),
        });
      }

      if (seccion === "alertas") {
        const idAlerta = editando?.id_alerta || editando?.id;

        if (editando && !idAlerta) {
          mostrarMensaje("Error", "No se encontró el ID de la alerta.");
          return;
        }

        if (!editando && !campo1.trim()) {
          mostrarMensaje("Error", "Ingresá el ID del botón.");
          return;
        }

        if (editando) {
          if (editando.activo) {
            mostrarMensaje(
              "No permitido",
              "Primero tenés que finalizar la alerta para poder modificarla."
            );
            return;
          }

          if (!campo2.trim()) {
            mostrarMensaje("Error", "Ingresá el piso.");
            return;
          }

          await editarAlerta(idAlerta, {
            id_boton: campo1.trim(),
            zona: campo2.trim(),
          });
        } else {
          await crearAlerta(campo1.trim());
        }
      }

      setModalVisible(false);
      await cargarRegistros();

      mostrarMensaje("Correcto", "Los cambios se guardaron.");

    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudieron guardar los cambios."
      );
    } finally {
      setGuardando(false);
    }
  }

const mostrarMensaje = (titulo, mensaje) => {
  if (Platform.OS === "web") {
    window.alert(`${titulo}\n\n${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

const ejecutarEliminacion = async (item) => {
  try {
    setCargando(true);

    if (seccion === "botones") {
      if (!item.id_boton) {
        throw new Error("No se encontró el ID del botón.");
      }

      await eliminarBoton(item.id_boton);
    }

    if (seccion === "usuarios") {
      const id = item.uid || item.id_usuario || item.id;

      if (!id) {
        throw new Error("No se encontró el ID del usuario.");
      }

      await eliminarUsuario(id);
    }

    if (seccion === "alertas") {
      const id = item.id_alerta || item.id;

      if (!id) {
        throw new Error("No se encontró el ID de la alerta.");
      }

      await eliminarAlerta(id);
    }

    await cargarRegistros();

    mostrarMensaje(
      "Eliminación correcta",
      "El registro se eliminó correctamente."
    );
  } catch (error) {
    mostrarMensaje(
      "Error al eliminar",
      error.message || "No se pudo eliminar el registro."
    );
  } finally {
    setCargando(false);
  }
};

const confirmarEliminar = (item) => {
  const mensaje = "¿Estás seguro de que querés eliminar este registro?";

  if (Platform.OS === "web") {
    const confirmar = window.confirm(mensaje);

    if (confirmar) {
      ejecutarEliminacion(item);
    }

    return;
  }

  Alert.alert(
    "Eliminar registro",
    mensaje,
    [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => ejecutarEliminacion(item),
      },
    ]
  );
};


  async function finalizar(item: any) {
    try {
      await finalizarAlerta(item.id_alerta);
      await cargarRegistros();

      Alert.alert("Correcto", "La alerta fue finalizada.");

    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudo finalizar la alerta."
      );
    }
  }

  async function cerrarSesion() {
    try {
      await signOut(auth);
      router.replace("/");
    } catch {
      Alert.alert("Error", "No se pudo cerrar la sesión.");
    }
  }

  function renderRegistro(item: any) {
    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
        {seccion === "botones" && (
        <>
            <Text style={styles.cardTitle}>
            Botón {item.numero}
            </Text>

            <Text selectable>UUID: {item.id_boton || item.id || "No disponible"}</Text>

            <Text selectable>Habitación: {item.habitacion}</Text>

            <Text selectable>Zona: {item.zona}</Text>
        </>
        )}
        {seccion === "usuarios" && (
        <>
            <Text style={styles.cardTitle}>
            {item.nombre}
            </Text>

            <Text selectable>Email: {item.email}</Text>

            <Text selectable>UUID: {item.uid || item.id || "No disponible"}</Text>

            <Text selectable>Teléfono: {item.telefono || "—"}</Text>

            <Text selectable>Zona: {item.zona || "—"}</Text>

            <Text selectable>Rol: {item.rol}</Text>
        </>
        )}

        {seccion === "alertas" && (
        <>
            <Text
            style={[
                styles.cardTitle,
                item.activo ? styles.active : styles.finished,
            ]}
            >
            {item.activo ? "ALERTA ACTIVA" : "FINALIZADA"}
            </Text>

            <Text selectable>UUID: {item.id_alerta || item.id || "No disponible"}</Text>

            <Text selectable>Botón: {item.id_boton || "—"}</Text>

            <Text selectable>Zona: {item.zona || "—"}</Text>

            <Text selectable>
            Inicio: {item.fecha_inicio
                ? new Date(item.fecha_inicio).toLocaleString()
                : "—"}
            </Text>

            <Text selectable>
            Finalización: {item.fecha_final
                ? new Date(item.fecha_final).toLocaleString()
                : "—"}
            </Text>
        </>
        )}
        {seccion === "alertas" && item.activo && (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={() => finalizar(item)}
          >
            <Text style={styles.smallWhite}>Finalizar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => abrirEdicion(item)}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => confirmarEliminar(item)}
          style={styles.actionButton}
        >
          <Text style={styles.deleteText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Administración</Text>
          <Text style={styles.subtitle}>
            Codigo azul panel de administracion
          </Text>
        </View>

        <TouchableOpacity onPress={cerrarSesion}>
          <Text style={styles.logout}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(["botones", "usuarios", "alertas"] as Seccion[]).map(
          (item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.tab,
                seccion === item && styles.selectedTab,
              ]}
              onPress={() => setSeccion(item)}
            >
              <Text
                style={[
                  styles.tabText,
                  seccion === item && styles.selectedTabText,
                ]}
              >
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.sectionTitle}>
          {seccion === "botones"
            ? "Botones"
            : seccion === "usuarios"
              ? "Usuarios"
              : "Historial de alertas"}
        </Text>

        {seccion !== "usuarios" && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={abrirNuevo}
          >
            <Text style={styles.smallWhite}>+ Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {cargando ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(item, index) =>
            `${seccion}-${item.id_boton || item.id_usuario || item.uid || item.id_alerta || item.id || "registro"}-${index}`
          }
          renderItem={({ item }) => renderRegistro(item)}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No hay registros para mostrar.
            </Text>
          }
          onRefresh={cargarRegistros}
          refreshing={cargando}
        />
      )}

      <TouchableOpacity
        style={styles.configureButton}
        onPress={() => router.push("/boton")}
      >
        <Text style={styles.smallWhite}>
          Configurar un botón
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <ScrollView
            style={styles.modal}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>
              {editando ? "Editar" : "Crear"}{" "}
              {seccion === "botones"
                ? "botón"
                : seccion === "usuarios"
                  ? "usuario"
                  : "alerta"}
            </Text>

            {seccion === "botones" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Número"
                  value={campo1}
                  onChangeText={setCampo1}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Habitación"
                  value={campo2}
                  onChangeText={setCampo2}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Zona"
                  value={campo3}
                  onChangeText={setCampo3}
                />
              </>
            )}

            {seccion === "usuarios" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre"
                  value={campo1}
                  onChangeText={setCampo1}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={campo2}
                  onChangeText={setCampo2}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Teléfono"
                  value={campo3}
                  onChangeText={setCampo3}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Zona"
                  value={campo4}
                  onChangeText={setCampo4}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Rol: empleado o admin"
                  value={campo5}
                  onChangeText={setCampo5}
                  autoCapitalize="none"
                />
              </>
            )}

            {seccion === "alertas" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="ID del botón"
                  value={campo1}
                  onChangeText={setCampo1}
                  autoCapitalize="none"
                />

                {editando && (
                  <TextInput
                    style={styles.input}
                    placeholder="zona"
                    value={campo2}
                    onChangeText={setCampo2}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={guardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.smallWhite}>
                  Guardar cambios
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
              disabled={guardando}
            >
              <Text>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 17,
    paddingTop: 55,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  tabs: {
    flexDirection: "row",
    gap: 7,
    marginVertical: 18,
  },
  tab: {
    flex: 1,
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#ddd",
    alignItems: "center",
  },
  selectedTab: {
    backgroundColor: "#222",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  selectedTabText: {
    color: "white",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#1769aa",
    padding: 10,
    borderRadius: 8,
  },
  notice: {
    color: "#805b00",
    backgroundColor: "#fff1c2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    padding: 13,
    borderRadius: 9,
    marginBottom: 10,
  },
  cardInfo: {
    marginBottom: 8,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  active: {
    color: "#c62828",
  },
  finished: {
    color: "#388e3c",
  },
  actionButton: {
    paddingVertical: 7,
  },
  actionText: {
    color: "#1769aa",
    fontWeight: "bold",
  },
  deleteText: {
    color: "#c62828",
    fontWeight: "bold",
  },
  finishButton: {
    backgroundColor: "#c62828",
    padding: 9,
    borderRadius: 7,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  smallWhite: {
    color: "white",
    fontWeight: "bold",
  },
  empty: {
    textAlign: "center",
    color: "#777",
    marginTop: 30,
  },
  configureButton: {
    backgroundColor: "#222",
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    maxHeight: "85%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 17,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#1769aa",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  cancelButton: {
    padding: 14,
    alignItems: "center",
  },
});