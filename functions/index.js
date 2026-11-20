
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(
    require("./codigoazulperez-firebase-adminsdk-fbsvc-064f9fa63a.json")
  ),
});

const db = admin.firestore();
const auth = admin.auth();

const app = express();

app.use(cors());
app.use(express.json());

const usuarios = db.collection("usuarios");
const botones = db.collection("botones");
const alertas = db.collection("alertas");

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function error500(res, error, mensaje) {
  console.error(error);
  return res.status(500).json({ error: mensaje });
}

function fechaJSON(fecha) {
  if (!fecha) return null;

  if (fecha.toDate) {
    return fecha.toDate().toISOString();
  }

  return fecha;
}

function formatear(doc) {
  const data = doc.data();

  return {
    ...data,
    fecha_inicio: fechaJSON(data.fecha_inicio),
    fecha_final: fechaJSON(data.fecha_final),
  };
}

// ==================================================
// AUTENTICACION
// ==================================================

// Comprueba que el usuario tenga un token válido
// y que exista su perfil en Firestore.

async function verificarUsuario(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Falta el token de autenticacion",
      });
    }

    const token = header.substring(7);

    const decoded = await auth.verifyIdToken(token);

    const usuarioDoc = await usuarios.doc(decoded.uid).get();

    if (!usuarioDoc.exists) {
      return res.status(403).json({
        error: "El usuario no tiene perfil registrado",
      });
    }

    req.usuario = {
      uid: decoded.uid,
      email: decoded.email,
      ...usuarioDoc.data(),
    };

    next();

  } catch (error) {
    console.error(error);

    return res.status(401).json({
      error: "Token invalido o expirado",
    });
  }
}

// ==================================================
// SOLO ADMINISTRADORES
// ==================================================

function verificarAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== "admin") {
    return res.status(403).json({
      error: "No tienes permisos de administrador",
    });
  }

  next();
}

// ==================================================
// USUARIOS
// ==================================================

// GET /usuarios
// Admin ve todos.
// Empleado solamente su propio perfil.

app.get("/usuarios", verificarUsuario, async (req, res) => {
  try {
    if (req.usuario.rol === "admin") {
      const snapshot = await usuarios.get();

      return res.json(
        snapshot.docs.map(doc => ({
          id: doc.id,
          uid: doc.id,
          ...doc.data(),
        }))
      );
    }

    const doc = await usuarios.doc(req.usuario.uid).get();

    res.json([{
      id: doc.id,
      uid: doc.id,
      ...doc.data(),
    }]);

  } catch (error) {
    error500(res, error, "Error al obtener usuarios");
  }
});

// GET /usuarios/me

app.get("/usuarios/me", verificarUsuario, async (req, res) => {
  try {
    const doc = await usuarios.doc(req.usuario.uid).get();

    res.json({
      id: doc.id,
      uid: doc.id,
      ...doc.data(),
    });

  } catch (error) {
    error500(res, error, "Error al obtener perfil");
  }
});

// GET /usuarios/:id
// Admin puede consultar cualquiera.
// Empleado solamente el suyo.

app.get("/usuarios/:id", verificarUsuario, async (req, res) => {
  try {
    const id = req.params.id;

    if (req.usuario.rol !== "admin" && req.usuario.uid !== id) {
      return res.status(403).json({
        error: "Acceso denegado",
      });
    }

    const doc = await usuarios.doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    res.json({
      id: doc.id,
      uid: doc.id,
      ...doc.data(),
    });

  } catch (error) {
    error500(res, error, "Error al obtener usuario");
  }
});

// POST /usuarios
// SOLO ADMIN
//
// Crea el usuario en Firebase Authentication
// y su perfil en Firestore.
//
// Body:
// {
//   "email": "usuario@gmail.com",
//   "password": "123456",
//   "nombre": "Juan",
//   "telefono": "1122334455",
//   "zona": "Planta 1",
//   "rol": "usuario"
// }
app.post("/usuarios/registro", async (req, res) => {
  let usuarioAuth = null;

  try {
    const {
      email,
      password,
      nombre,
      telefono,
      zona,
    } = req.body;

    if (!email || !password || !nombre || !zona) {
      return res.status(400).json({
        error: "Email, contraseña, nombre y zona son obligatorios",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Crear cuenta en Authentication
    usuarioAuth = await auth.createUser({
      email: email.trim(),
      password,
      displayName: nombre.trim(),
    });

    const uid = usuarioAuth.uid;

    // Crear perfil en Firestore
    const nuevoUsuario = {
      id_usuario: uid,
      nombre: nombre.trim(),
      email: usuarioAuth.email || email.trim(),
      telefono: telefono || "",
      zona: zona.trim(),
      rol: "usuario",
    };

    await usuarios.doc(uid).create(nuevoUsuario);

    return res.status(201).json({
      mensaje: "Registro exitoso",
      usuario: {
        uid,
        ...nuevoUsuario,
      },
    });

  } catch (error) {
    console.error("ERROR EN REGISTRO:", error);

    // Revertir Authentication si falla Firestore
    if (usuarioAuth) {
      try {
        await auth.deleteUser(usuarioAuth.uid);
      } catch (errorEliminacion) {
        console.error("Error al revertir usuario:", errorEliminacion);
      }
    }

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        error: "Ese email ya está registrado",
      });
    }

    return error500(res, error, "No se pudo registrar el usuario");
  }
});


// PUT /usuarios/:id
// SOLO ADMIN

app.put(
  "/usuarios/:id",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const id = req.params.id;

      const permitidos = [
        "nombre",
        "telefono",
        "zona",
        "rol",
      ];

      const cambios = {};

      for (const campo of permitidos) {
        if (req.body[campo] !== undefined) {
          cambios[campo] = req.body[campo];
        }
      }

      if (
        cambios.rol !== undefined &&
        !["admin", "empleado"].includes(cambios.rol)
      ) {
        return res.status(400).json({
          error: "Rol no valido",
        });
      }

      if (Object.keys(cambios).length === 0) {
        return res.status(400).json({
          error: "No hay datos para modificar",
        });
      }

      const ref = usuarios.doc(id);
      const doc = await ref.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      await ref.update(cambios);

      const actualizado = await ref.get();

      res.json({
        mensaje: "Usuario actualizado",
        usuario: {
          id: actualizado.id,
          ...actualizado.data(),
        },
      });

    } catch (error) {
      error500(res, error, "Error al actualizar usuario");
    }
  }
);

// DELETE /usuarios/:id
// SOLO ADMIN

app.delete(
  "/usuarios/:id",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const id = req.params.id;

      if (id === req.usuario.uid) {
        return res.status(400).json({
          error: "No puedes eliminar tu propia cuenta desde este endpoint",
        });
      }

      const ref = usuarios.doc(id);
      const doc = await ref.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "Usuario no encontrado",
        });
      }

      // Eliminar perfil de Firestore
      await ref.delete();

      // Eliminar cuenta de Authentication
      try {
        await auth.deleteUser(id);
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }

      res.json({
        mensaje: "Usuario eliminado correctamente",
      });

    } catch (error) {
      error500(res, error, "Error al eliminar usuario");
    }
  }
);

// ==================================================
// BOTONES
// ==================================================

// GET /botones
// Admin ve todos.
// Empleado ve los de su zona.


app.get("/botones", verificarUsuario, async (req, res) => {
  try {
    let consulta = db.collection("botones");

    if (req.usuario.rol !== "admin") {
      if (!req.usuario.zona) {
        return res.status(403).json({
          error: "El usuario no tiene una zona asignada."
        });
      }

      consulta = consulta.where(
        "zona",
        "==",
        req.usuario.zona
      );
    }

    const snapshot = await consulta.get();

    const listaBotones = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id_boton: doc.id
    }));

return res.status(200).json(listaBotones);

    return res.status(200).json(botones);

  } catch (error) {
    console.error("ERROR GET BOTONES:", error);

    return res.status(500).json({
      error: "No se pudieron obtener los botones."
    });
  }
});


// GET /botones/:id

app.get("/botones/:id", verificarUsuario, async (req, res) => {
  try {
    const doc = await botones.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "Boton no encontrado",
      });
    }

    const boton = doc.data();

    if (
      req.usuario.rol !== "admin" &&
      boton.zona !== req.usuario.zona
    ) {
      return res.status(403).json({
        error: "Acceso denegado",
      });
    }

    res.json({
      id: doc.id,
      uid: doc.id,
      ...boton,
    });

  } catch (error) {
    error500(res, error, "Error al obtener boton");
  }
});

// POST /botones
// SOLO ADMIN

app.post(
  "/botones",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const { numero, habitacion, zona } = req.body;

      if (
        numero === undefined ||
        !habitacion ||
        !zona
      ) {
        return res.status(400).json({
          error: "Numero, habitacion y zona son obligatorios",
        });
      }

      const ref = botones.doc();

      const nuevoBoton = {
        id_boton: ref.id,
        numero,
        habitacion,
        zona,
      };

      await ref.create(nuevoBoton);

      res.status(201).json({
        mensaje: "Boton creado correctamente",
        boton: nuevoBoton,
      });

    } catch (error) {
      error500(res, error, "Error al crear boton");
    }
  }
);

// PUT /botones/:id
// SOLO ADMIN

app.put(
  "/botones/:id",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const { numero, habitacion, zona } = req.body;

      const cambios = {};

      if (numero !== undefined) cambios.numero = numero;
      if (habitacion !== undefined) cambios.habitacion = habitacion;
      if (zona !== undefined) cambios.zona = zona;

      if (Object.keys(cambios).length === 0) {
        return res.status(400).json({
          error: "No hay datos para modificar",
        });
      }

      const ref = botones.doc(req.params.id);
      const doc = await ref.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "Boton no encontrado",
        });
      }

      await ref.update(cambios);

      res.json({
        mensaje: "Boton actualizado",
        boton: {
          ...doc.data(),
          ...cambios,
        },
      });

    } catch (error) {
      error500(res, error, "Error al actualizar boton");
    }
  }
);

// DELETE /botones/:id
// SOLO ADMIN

app.delete(
  "/botones/:id",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const ref = botones.doc(req.params.id);
      const doc = await ref.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "Boton no encontrado",
        });
      }

      const activas = await alertas
        .where("id_boton", "==", req.params.id)
        .where("activo", "==", true)
        .get();

      if (!activas.empty) {
        return res.status(409).json({
          error: "No se puede eliminar un boton con alertas activas",
        });
      }

      await ref.delete();

      res.json({
        mensaje: "Boton eliminado correctamente",
      });

    } catch (error) {
      error500(res, error, "Error al eliminar boton");
    }
  }
);

// ==================================================
// ALERTAS
// ==================================================

// GET /alertas
// Admin: todas, incluidas las antiguas.
// Empleado: solo activas de su zona.

app.get("/alertas", verificarUsuario, async (req, res) => {
  try {
    let query = alertas;

    if (req.usuario.rol !== "admin") {
      query = query
        .where("zona", "==", req.usuario.zona)
        .where("activo", "==", true);
    }

    const snapshot = await query.get();

    res.json(
      snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...formatear(doc),
      }))
    );

  } catch (error) {
    error500(res, error, "Error al obtener alertas");
  }
});

// GET /alertas/empleado/zona
// Empleado: alertas activas de su zona.
// Admin: alertas activas de todas las zonas.

app.get(
  "/alertas/empleado/zona",
  verificarUsuario,
  async (req, res) => {
    try {
      let query = alertas.where("activo", "==", true);

      if (req.usuario.rol !== "admin") {
        query = query.where("zona", "==", req.usuario.zona);
      }

      const snapshot = await query.get();

      res.json(
        snapshot.docs.map(doc => ({
          id: doc.id,
          uid: doc.id,
          ...formatear(doc),
        }))
      );

    } catch (error) {
      error500(res, error, "Error al obtener alertas de zona");
    }
  }
);

// GET /alertas/:id

app.get("/alertas/:id", verificarUsuario, async (req, res) => {
  try {
    const doc = await alertas.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "Alerta no encontrada",
      });
    }

    const alerta = doc.data();

    if (
      req.usuario.rol !== "admin" &&
      (alerta.zona !== req.usuario.zona || !alerta.activo)
    ) {
      return res.status(403).json({
        error: "Acceso denegado",
      });
    }

    res.json({
      id: doc.id,
      uid: doc.id,
      ...formatear(doc),
    });

  } catch (error) {
    error500(res, error, "Error al obtener alerta");
  }
});

// POST /alertas
// SOLO ADMIN
// Crear alerta manualmente.

app.post(
  "/alertas",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const { id_boton } = req.body;

      if (!id_boton) {
        return res.status(400).json({
          error: "Falta id_boton",
        });
      }

      const botonDoc = await botones.doc(id_boton).get();

      if (!botonDoc.exists) {
        return res.status(404).json({
          error: "Boton no encontrado",
        });
      }

      const boton = botonDoc.data();

      const ref = alertas.doc();
      const fecha = admin.firestore.Timestamp.now();

      const nuevaAlerta = {
        id_alerta: ref.id,
        id_boton,
        zona: boton.zona,
        activo: true,
        fecha_inicio: fecha,
        fecha_final: null,
      };

      await ref.create(nuevaAlerta);

      res.status(201).json({
        mensaje: "Alerta creada correctamente",
        alerta: {
          ...nuevaAlerta,
          fecha_inicio: fechaJSON(fecha),
        },
      });

    } catch (error) {
      error500(res, error, "Error al crear alerta");
    }
  }
);

// PUT /alertas/:id
// SOLO ADMIN
// Permite modificar el botón asociado y/o la zona de una alerta finalizada.

app.put(
  "/alertas/:id",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const { id_boton, zona } = req.body;

      const ref = alertas.doc(req.params.id);
      const doc = await ref.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "Alerta no encontrada",
        });
      }

      if (doc.data().activo) {
        return res.status(409).json({
          error: "No se puede modificar una alerta activa",
        });
      }

      const cambios = {};

      // Modificar botón si fue enviado
      if (id_boton !== undefined) {
        if (!id_boton) {
          return res.status(400).json({
            error: "El id_boton no puede estar vacío",
          });
        }

        const botonDoc = await botones.doc(id_boton).get();

        if (!botonDoc.exists) {
          return res.status(404).json({
            error: "Botón no encontrado",
          });
        }

        cambios.id_boton = id_boton;

        // Si se cambia el botón y no se envía una zona,
        // se utiliza automáticamente la zona del nuevo botón.
        if (zona === undefined) {
          cambios.zona = botonDoc.data().zona;
        }
      }

      // Modificar zona si fue enviada
      if (zona !== undefined) {
        if (typeof zona !== "string" || !zona.trim()) {
          return res.status(400).json({
            error: "La zona no puede estar vacía",
          });
        }

        cambios.zona = zona.trim();
      }

      if (Object.keys(cambios).length === 0) {
        return res.status(400).json({
          error: "Debés enviar id_boton, zona o ambos",
        });
      }

      await ref.update(cambios);

      const actualizado = await ref.get();

      return res.status(200).json({
        mensaje: "Alerta actualizada correctamente",
        alerta: {
          id: actualizado.id,
          ...formatear(actualizado),
        },
      });

    } catch (error) {
      error500(res, error, "Error al actualizar alerta");
    }
  }
);


// PUT /alertas/:id/finalizar
// SOLO ADMIN
// Finaliza una alerta una sola vez.

app.put(
  "/alertas/:id/finalizar",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const ref = alertas.doc(req.params.id);

      const resultado = await db.runTransaction(async tx => {
        const doc = await tx.get(ref);

        if (!doc.exists) {
          throw new Error("NO_EXISTE");
        }

        const data = doc.data();

        if (!data.activo || data.fecha_final !== null) {
          throw new Error("YA_FINALIZADA");
        }

        const fecha = admin.firestore.Timestamp.now();

        tx.update(ref, {
          activo: false,
          fecha_final: fecha,
        });

        return {
          ...data,
          activo: false,
          fecha_final: fecha,
        };
      });

      res.json({
        mensaje: "Alerta finalizada correctamente",
        alerta: {
          ...resultado,
          fecha_inicio: fechaJSON(resultado.fecha_inicio),
          fecha_final: fechaJSON(resultado.fecha_final),
        },
      });

    } catch (error) {
      if (error.message === "NO_EXISTE") {
        return res.status(404).json({
          error: "Alerta no encontrada",
        });
      }

      if (error.message === "YA_FINALIZADA") {
        return res.status(409).json({
          error: "La alerta ya fue finalizada",
        });
      }

      error500(res, error, "Error al finalizar alerta");
    }
  }
);

// DELETE /alertas/:id
// SOLO ADMIN

app.delete(
  "/alertas/:id",
  verificarUsuario,
  verificarAdmin,
  async (req, res) => {
    try {
      const ref = alertas.doc(req.params.id);
      const doc = await ref.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "Alerta no encontrada",
        });
      }

      await ref.delete();

      res.json({
        mensaje: "Alerta eliminada correctamente",
      });

    } catch (error) {
      error500(res, error, "Error al eliminar alerta");
    }
  }
);

// ==================================================
// PULSAR BOTON: GENERAR O FINALIZAR ALERTA
// ==================================================

// POST /botones/:id/presionar
//
// PUBLICO: no necesita token.
//
// Primera pulsacion: crea alerta.
// Segunda pulsacion: finaliza alerta.
//
// El estado se gestiona mediante una transaccion.

app.post("/botones/:id/presionar", async (req, res) => {
  try {
    const botonRef = botones.doc(req.params.id);

    const resultado = await db.runTransaction(async tx => {
      const botonDoc = await tx.get(botonRef);

      if (!botonDoc.exists) {
        throw new Error("BOTON_NO_EXISTE");
      }

      const boton = botonDoc.data();

      const query = alertas
        .where("id_boton", "==", botonRef.id)
        .where("activo", "==", true);

      const activas = await tx.get(query);

      // Si ya existe una alerta activa, finalizarla.

      if (!activas.empty) {
        const alertaDoc = activas.docs[0];

        const fecha = admin.firestore.Timestamp.now();

        tx.update(alertaDoc.ref, {
          activo: false,
          fecha_final: fecha,
        });

        return {
          accion: "finalizada",
          id_alerta: alertaDoc.id,
          fecha_final: fechaJSON(fecha),
        };
      }

      // Si no existe una alerta activa, crearla.

      const ref = alertas.doc();
      const fecha = admin.firestore.Timestamp.now();

      tx.create(ref, {
        id_alerta: ref.id,
        id_boton: botonRef.id,
        zona: boton.zona,
        activo: true,
        fecha_inicio: fecha,
        fecha_final: null,
      });

      return {
        accion: "creada",
        id_alerta: ref.id,
        fecha_inicio: fechaJSON(fecha),
      };
    });

    res.json({
      mensaje: resultado.accion === "creada"
        ? "Alerta generada correctamente"
        : "Alerta finalizada correctamente",
      ...resultado,
    });

  } catch (error) {
    if (error.message === "BOTON_NO_EXISTE") {
      return res.status(404).json({
        error: "Boton no encontrado",
      });
    }

    error500(res, error, "Error al pulsar boton");
  }
});

// ==================================================
// VERIFICAR BOTÓN PÚBLICO POR UUID
// GET /botones/publico/:id
// ==================================================

app.get("/botones/publico/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    if (!id) {
      return res.status(400).json({
        error: "Falta el UUID del botón."
      });
    }

    // Primero busca por ID real del documento.
    let doc = await botones.doc(id).get();

    // Si no existe, busca por el campo id_boton.
    if (!doc.exists) {
      const resultado = await botones
        .where("id_boton", "==", id)
        .limit(1)
        .get();

      if (!resultado.empty) {
        doc = resultado.docs[0];
      }
    }

    if (!doc.exists) {
      console.log("UUID recibido:", id);

      return res.status(404).json({
        error: "No existe un botón con ese UUID."
      });
    }

    return res.status(200).json({
      boton: {
        ...doc.data(),
        id_boton: doc.id
      }
    });

  } catch (error) {
    console.error("ERROR VERIFICAR BOTÓN PÚBLICO:", error);

    return res.status(500).json({
      error: "No se pudo verificar el botón."
    });
  }
});

// ==================================================
// PRESIONAR BOTÓN PÚBLICO POR UUID
// POST /botones/:id/presionar-publico
// ==================================================

app.post("/botones/:id/presionar-publico", async (req, res) => {
  try {
    const botonRef = botones.doc(req.params.id);

    const resultado = await db.runTransaction(async (tx) => {
      const botonDoc = await tx.get(botonRef);

      if (!botonDoc.exists) {
        throw new Error("BOTON_NO_EXISTE");
      }

      const boton = botonDoc.data();

      const consulta = alertas
        .where("id_boton", "==", botonRef.id)
        .where("activo", "==", true);

      const activas = await tx.get(consulta);

      if (activas.size > 1) {
        throw new Error("MULTIPLES_ALERTAS_ACTIVAS");
      }

      // Si ya existe una alerta activa, la finaliza.
      if (!activas.empty) {
        const alertaDoc = activas.docs[0];
        const fecha = admin.firestore.Timestamp.now();

        tx.update(alertaDoc.ref, {
          activo: false,
          fecha_final: fecha
        });

        return {
          accion: "finalizada",
          id_alerta: alertaDoc.id,
          fecha_final: fechaJSON(fecha)
        };
      }

      // Si no existe una alerta activa, crea una nueva.
      const alertaRef = alertas.doc();
      const fecha = admin.firestore.Timestamp.now();

      tx.create(alertaRef, {
        id_alerta: alertaRef.id,
        id_boton: botonRef.id,
        zona: boton.zona,
        activo: true,
        fecha_inicio: fecha,
        fecha_final: null
      });

      return {
        accion: "creada",
        id_alerta: alertaRef.id,
        fecha_inicio: fechaJSON(fecha)
      };
    });

    return res.status(200).json({
      mensaje: resultado.accion === "creada"
        ? "Alerta creada correctamente."
        : "Alerta finalizada correctamente.",
      ...resultado
    });

  } catch (error) {
    console.error("ERROR PRESIONAR BOTÓN PÚBLICO:", error);

    if (error.message === "BOTON_NO_EXISTE") {
      return res.status(404).json({
        error: "El botón no existe."
      });
    }

    if (error.message === "MULTIPLES_ALERTAS_ACTIVAS") {
      return res.status(409).json({
        error: "El botón tiene más de una alerta activa. Revisá los datos."
      });
    }

    return res.status(500).json({
      error: "No se pudo procesar la pulsación."
    });
  }
});

// ==================================================
// INICIAR SERVIDOR
// ==================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API corriendo en el puerto ${PORT}`);
});