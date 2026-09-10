// liveCollectionStore.js
// Colecciones completas (tutores, pacientes) mantenidas en memoria con un único onSnapshot compartido.
// La primera vista abre el listener y lo deja vivo: las navegaciones siguientes renderizan al instante
// y Firestore solo envía los documentos que cambian (ventas, ediciones, bajas se reflejan solas).
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
        if (snap.docChanges().length > 0 || store.state.isLoading) {
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
      return () => store.listeners.delete(onChange);
    },
    [store]
  );

  return useSyncExternalStore(subscribe, () => store.state);
};
