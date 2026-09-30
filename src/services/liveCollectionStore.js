// liveCollectionStore.js
// Colecciones completas (tutores, pacientes) mantenidas en memoria con un único onSnapshot compartido.
// El listener existe solamente mientras alguna vista usa la colección.
// Con la caché persistente de firebase/config.js, al recargar o abrir otra pestaña la lista sale
// primero de IndexedDB y se sincroniza en segundo plano (isSyncing).
import { useCallback, useSyncExternalStore } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const stores = new Map();

const createStore = (name) => {
  const store = {
    state: { docs: [], isLoading: true, isSyncing: true, error: null },
    listeners: new Set(),
    unsubscribe: null,
  };

  const emit = (patch) => {
    store.state = { ...store.state, ...patch };
    store.listeners.forEach((listener) => listener());
  };

  store.start = () => {
    if (store.unsubscribe) return;
    store.unsubscribe = onSnapshot(
      collection(db, name),
      { includeMetadataChanges: true },
      (snap) => {
        const { fromCache } = snap.metadata;
        const patch = { isSyncing: fromCache, isLoading: fromCache && snap.empty, error: null };
        // Los cambios solo de metadata (confirmación del servidor, cache → server) no reconstruyen la lista.
        if (snap.empty || snap.docChanges().length > 0 || store.state.isLoading) {
          patch.docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
        emit(patch);
      },
      (error) => {
        console.error(`Error escuchando la colección ${name}:`, error);
        store.unsubscribe = null; // se reintenta en el próximo montaje
        emit({ error, isLoading: false, isSyncing: false });
      }
    );
  };

  return store;
};

export const useLiveCollection = (name) => {
  if (!stores.has(name)) stores.set(name, createStore(name));
  const store = stores.get(name);

  const subscribe = useCallback(
    (onChange) => {
      store.listeners.add(onChange);
      store.start();
      return () => {
        store.listeners.delete(onChange);
        if (store.listeners.size === 0) {
          store.unsubscribe?.();
          store.unsubscribe = null;
          // No conservar datos de una sesión anterior ni una lista que ya no se sincroniza.
          store.state = { docs: [], isLoading: true, isSyncing: true, error: null };
        }
      };
    },
    [store]
  );

  return useSyncExternalStore(subscribe, () => store.state);
};
