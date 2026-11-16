
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";

import { router } from "expo-router";

import {
  verificarBotonPublico,
  presionarBotonPublico,
} from "../services/botones";

type Boton = {
  id_boton: string;
  numero: number;
  habitacion: string;
  zona: string;
};

export default function PantallaBoton() {
  const [uuid, setUuid] = useState("");
  const [boton, setBoton] = useState<Boton | null>(null);
  const [cargando, setCargando] = useState(false);
  const [alertaActiva, setAlertaActiva] = useState(false);

  function mostrarMensaje(titulo: string, mensaje: string) {
    if (Platform.OS === "web") {
      window.alert(`${titulo}\n\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  }

  async function verificar() {
    const id = uuid.trim();

    if (!id) {
      mostrarMensaje("Dato incompleto", "Ingresá el UUID del botón.");
      return;
    }

    try {
      setCargando(true);

      const respuesta = await verificarBotonPublico(id);

      setBoton(respuesta.boton);
      setAlertaActiva(false);

    } catch (error: any) {
      setBoton(null);

      mostrarMensaje(
        "No se encontró el botón",
        error.message || "El UUID ingresado no corresponde a un botón."
      );
    } finally {
      setCargando(false);
    }
  }

  async function pulsar() {
    if (!boton || cargando) return;

    try {
      setCargando(true);

      const respuesta = await presionarBotonPublico(boton.id_boton);

      const nuevaAlertaActiva = respuesta.accion === "creada";

      setAlertaActiva(nuevaAlertaActiva);

      // Confirmación informativa, sin pedir otra interacción.
      if (nuevaAlertaActiva) {
        mostrarMensaje(
          "Alerta generada",
          "La alerta fue enviada correctamente."
        );
      } else {
        mostrarMensaje(
          "Alerta finalizada",
          "La alerta fue finalizada correctamente."
        );
      }

    } catch (error: any) {
      mostrarMensaje(
        "Error",
        error.message || "No se pudo procesar la pulsación."
      );
    } finally {
      setCargando(false);
    }
  }

  function configurarOtro() {
    setBoton(null);
    setUuid("");
    setAlertaActiva(false);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SISTEMA DE ALERTAS</Text>

        <Text style={styles.title}>
          Panel de botón
        </Text>

        <Text style={styles.description}>
          Identificá tu botón mediante su UUID para poder utilizarlo.
        </Text>
      </View>

      {!boton ? (
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⌕</Text>
          </View>

          <Text style={styles.cardTitle}>
            Verificar botón
          </Text>

          <Text style={styles.helper}>
            Ingresá el identificador único del botón.
          </Text>

          <Text style={styles.label}>UUID DEL BOTÓN</Text>

          <TextInput
            style={styles.input}
            placeholder="Pegá el UUID acá"
            placeholderTextColor="#999"
            value={uuid}
            onChangeText={setUuid}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!cargando}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              cargando && styles.disabledButton,
            ]}
            onPress={verificar}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>
                VERIFICAR BOTÓN
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.verifiedHeader}>
            <View style={styles.statusDot} />
            <Text style={styles.verifiedText}>
              BOTÓN VERIFICADO
            </Text>
          </View>

          <Text style={styles.cardTitle}>
            Botón {boton.numero}
          </Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>UUID</Text>
            <Text style={styles.dataValue}>
              {boton.id_boton}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Habitación</Text>
            <Text style={styles.dataValue}>
              {boton.habitacion}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Zona</Text>
            <Text style={styles.dataValue}>
              {boton.zona}
            </Text>
          </View>

          <View style={[
            styles.statusBox,
            alertaActiva && styles.statusBoxActive,
          ]}>
            <Text style={[
              styles.statusBoxText,
              alertaActiva && styles.statusBoxTextActive,
            ]}>
              {alertaActiva
                ? "ALERTA ACTIVA"
                : "SIN ALERTAS ACTIVAS"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.alertButton,
              alertaActiva && styles.finishButton,
              cargando && styles.disabledButton,
            ]}
            onPress={pulsar}
            disabled={cargando}
            activeOpacity={0.75}
          >
            {cargando ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <>
                <Text style={styles.alertButtonTitle}>
                  {alertaActiva
                    ? "FINALIZAR ALERTA"
                    : "PRESIONAR BOTÓN"}
                </Text>

                <Text style={styles.alertButtonSubtitle}>
                  {alertaActiva
                    ? "Presioná para finalizar la alerta"
                    : "Presioná para generar una alerta"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={configurarOtro}
            disabled={cargando}
          >
            <Text style={styles.secondaryButtonText}>
              Utilizar otro botón
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.replace("/")}
        style={styles.backButton}
      >
        <Text style={styles.backText}>
          Volver al inicio
        </Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Sistema de gestión de alertas
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f1f4f8",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  eyebrow: {
    color: "#1769aa",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 9,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#172033",
    textAlign: "center",
  },
  description: {
    color: "#697386",
    fontSize: 14,
    textAlign: "center",
    marginTop: 9,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 23,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#e8f1fb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  icon: {
    fontSize: 32,
    color: "#1769aa",
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#172033",
    marginBottom: 8,
  },
  helper: {
    color: "#697386",
    fontSize: 14,
    marginBottom: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#536176",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f7f9fc",
    borderWidth: 1,
    borderColor: "#dce2eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#172033",
    marginBottom: 17,
  },
  primaryButton: {
    backgroundColor: "#1769aa",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  verifiedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#239b62",
  },
  verifiedText: {
    color: "#239b62",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  dataRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#edf0f4",
    paddingVertical: 13,
  },
  dataLabel: {
    color: "#7a8494",
    fontSize: 12,
    marginBottom: 5,
  },
  dataValue: {
    color: "#172033",
    fontSize: 14,
    fontWeight: "600",
  },
  statusBox: {
    backgroundColor: "#edf0f4",
    padding: 12,
    borderRadius: 9,
    alignItems: "center",
    marginTop: 20,
  },
  statusBoxActive: {
    backgroundColor: "#ffebeb",
  },
  statusBoxText: {
    color: "#697386",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  statusBoxTextActive: {
    color: "#c62828",
  },
  alertButton: {
    backgroundColor: "#c62828",
    padding: 19,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
    minHeight: 75,
    justifyContent: "center",
  },
  finishButton: {
    backgroundColor: "#1769aa",
  },
  alertButtonTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  alertButtonSubtitle: {
    color: "#ffe1e1",
    fontSize: 12,
    marginTop: 5,
  },
  secondaryButton: {
    alignItems: "center",
    padding: 15,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: "#1769aa",
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
    marginTop: 25,
  },
  backText: {
    color: "#1769aa",
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "#9aa3b1",
    fontSize: 11,
    marginTop: 28,
  },
});
