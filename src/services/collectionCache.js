// collectionCache.js
// Caché en memoria (por pestaña) para lecturas completas que se repiten al abrir modales y selectores.
// Cada getDocs de una colección cuesta una lectura por documento: sin esto, abrir el modal de turnos
// descarga tutores + pacientes enteros cada vez. Las lecturas simultáneas comparten una sola consulta.
// Las pantallas que crean/editan/borran tutores o pacientes llaman invalidateCollections() para no mostrar datos viejos.
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase/config";

const DEFAULT_TTL = 10 * 60 * 1000;
// Catálogos chicos (servicios, peluqueros) que se editan desde varias pantallas sin invalidar la caché.
export const SMALL_COLLECTION_TTL = 2 * 60 * 1000;
const entries = new Map();

export const getCachedDocs = (key, loader, ttl = DEFAULT_TTL) => {
  const entry = entries.get(key);
  if (entry && (entry.promise || Date.now() - entry.timestamp < ttl)) {
    return entry.promise || Promise.resolve(entry.data);
  }
  const promise = loader().then(
    (data) => {
      entries.set(key, { data, timestamp: Date.now() });
      return data;
    },
    (error) => {
      entries.delete(key);
      throw error;
    }
  );
  entries.set(key, { promise, timestamp: 0 });
  return promise;
};

// Devuelve una copia del arreglo cacheado: quien la reciba puede ordenarla sin afectar a los demás.
export const getCachedCollection = async (name, constraints = [], key = name, ttl) => {
  const docs = await getCachedDocs(
    key,
    async () => {
      const snap = await getDocs(constraints.length ? query(collection(db, name), ...constraints) : collection(db, name));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    ttl
  );
  return [...docs];
};

// Descarta toda entrada cuya clave sea una de las colecciones indicadas o empiece con "<colección>:".
export const invalidateCollections = (...names) => {
  for (const key of [...entries.keys()]) {
    if (names.some((name) => key === name || key.startsWith(`${name}:`))) entries.delete(key);
  }
};
