
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { router } from "expo-router";
import { crearUsuario } from "../services/usuarios";
import { Platform, Alert } from "react-native";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zona, setZona] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [cargando, setCargando] = useState(false);

// Agregá esta función dentro del componente Registro.
function mostrarMensaje(titulo: string, mensaje: string) {
  if (Platform.OS === "web") {
    window.alert(`${titulo}\n\n${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
}
async function registrarse() {
  if (
    !nombre.trim() ||
    !email.trim() ||
    !zona.trim() ||
    !password ||
    !confirmarPassword
  ) {
    mostrarMensaje("Error", "Completá todos los campos obligatorios.");
    return;
  }

  if (password !== confirmarPassword) {
    mostrarMensaje("Error", "Las contraseñas no coinciden.");
    return;
  }

  if (password.length < 6) {
    mostrarMensaje("Error", "La contraseña debe tener al menos 6 caracteres.");
    return;
  }

  try {
    setCargando(true);

    const respuesta = await crearUsuario({
      nombre: nombre.trim(),
      email: email.trim(),
      password: password,
      telefono: telefono.trim(),
      zona: zona.trim(),
    },);

    console.log("USUARIO REGISTRADO:", respuesta);

    mostrarMensaje(
      "Cuenta creada",
      "Tu cuenta y tu perfil fueron creados correctamente."
    );

    router.replace("/login");

  } catch (error: any) {
    console.error("ERROR REGISTRO:", error);

    mostrarMensaje(
      "Error al registrar",
      error.message || "No se pudo completar el registro."
    );

  } finally {
    setCargando(false);
  }
}


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Teléfono (opcional)"
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Zona"
        value={zona}
        onChangeText={setZona}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Repetir contraseña"
        value={confirmarPassword}
        onChangeText={setConfirmarPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={registrarse}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Crear cuenta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/login")}
        disabled={cargando}
      >
        <Text style={styles.link}>
          ¿Ya tenés cuenta? Iniciá sesión
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 15,
    color: "#1769aa",
  },
});
