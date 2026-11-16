
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";

import { auth } from "../services/firebase";
import { apiRequest } from "../services/api";

type Usuario = {
  id_usuario: string;
  nombre: string;
  email: string;
  rol: "admin" | "empleado";
  zona?: string;
};

export default function Index() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);

      if (!user) {
        setCargando(false);
        setErrorPerfil(false);
        return;
      }

      setCargando(true);
      setErrorPerfil(false);

      try {
        const perfil: Usuario = await apiRequest("/usuarios/me");

        if (perfil.rol === "admin") {
          router.replace("/admin");
        } else if (perfil.rol === "empleado") {
          router.replace("/empleado");
        } else {
          throw new Error("El usuario no tiene un rol válido.");
        }
      } catch (error) {
        console.error("Error al obtener el perfil:", error);
        setErrorPerfil(true);
      } finally {
        setCargando(false);
      }
    });

    return unsubscribe;
  }, []);

  function irLogin() {
    router.push("/login");
  }

  function irRegistro() {
    router.push("/registro");
  }

  function irBoton() {
    router.push("/boton");
  }

  async function reintentar() {
    if (!auth.currentUser) return;

    setCargando(true);
    setErrorPerfil(false);

    try {
      // Fuerza una nueva lectura del perfil
      const perfil: Usuario = await apiRequest("/usuarios/me");

      if (perfil.rol === "admin") {
        router.replace("/admin");
      } else if (perfil.rol === "empleado") {
        router.replace("/empleado");
      } else {
        throw new Error("El usuario no tiene un rol válido.");
      }
    } catch (error) {
      console.error(error);
      setErrorPerfil(true);
      Alert.alert(
        "Error",
        "No se pudo obtener el perfil. Verificá tu conexión o consultá con un administrador."
      );
    } finally {
      setCargando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.contenedor}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.textoCargando}>
          Verificando usuario...
        </Text>
      </View>
    );
  }

  if (errorPerfil && usuario) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.titulo}>No se pudo cargar tu perfil</Text>

        <Text style={styles.descripcion}>
          Tu sesión está iniciada, pero no pudimos obtener tus datos.
          Intentá nuevamente.
        </Text>

        <TouchableOpacity
          style={styles.boton}
          onPress={reintentar}
        >
          <Text style={styles.textoBoton}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Usuario no autenticado
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Codigo Azul</Text>

      <Text style={styles.descripcion}>
        Bienvenido. Seleccioná cómo querés ingresar.
      </Text>

      <TouchableOpacity
        style={styles.boton}
        onPress={irLogin}
      >
        <Text style={styles.textoBoton}>Iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botonSecundario}
        onPress={irRegistro}
      >
        <Text style={styles.textoBotonSecundario}>Registrarse</Text>
      </TouchableOpacity>

      <View style={styles.separador} />

      <Text style={styles.textoBotonPublico}>
        ¿Necesitás activar una alerta?
      </Text>

      <TouchableOpacity
        style={styles.botonAlerta}
        onPress={irBoton}
      >
        <Text style={styles.textoBoton}>
          Configurar / Presionar botón
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  titulo: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },

  descripcion: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 23,
  },

  textoCargando: {
    marginTop: 15,
    fontSize: 16,
    color: "#374151",
  },

  boton: {
    width: "100%",
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  textoBoton: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

  botonSecundario: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  textoBotonSecundario: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "bold",
  },

  separador: {
    width: "100%",
    height: 1,
    backgroundColor: "#d1d5db",
    marginVertical: 25,
  },

  textoBotonPublico: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 15,
  },

  botonAlerta: {
    width: "100%",
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
});
