// Carga inicial del catálogo de tipos de estudios de laboratorio en `tipos_estudios`.
// Uso: node scripts/seedTiposEstudios.js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const env = {};
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv(join(__dirname, '..', '.env'));

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const ESTUDIOS = [
  'HEMOGRAMA',
  'PLAQUETAS',
  'COAGULOGRAMA',
  'HEPATOGRAMA',
  'ACETIL COLINESTERASA SÉRICA HEPÁTICA',
  'ÁCIDOS BILIARES',
  'CIANOCOBALAMINA',
  'ÁCIDO FÓLICO',
  'MAGNESIO',
  'FOSFATEMIA',
  'CALCEMIA',
  'IONOGRAMA',
  'PROTEÍNAS FRACCIONADAS',
  'LIPIDOGRAMA VETERINARIO',
  'GLUCEMIA',
  'INSULINA',
  'AMILASA PANCREÁTICA',
  'LIPASA PANCREÁTICA',
  'ÁCIDO ÚRICO',
  'UREA',
  'CREATININA',
  'CORTISOL',
  'T4 TOTAL (CANINO O FELINO)',
  'TSH (EQUINOS ANIMALES)',
  'HbA1 GLICOSILADA',
  'FRUCTOSAMINA',
  'ORINA COMPLETA',
  'UPC EN ORINA',
  'CORTISOL EN ORINA 24 HS.',
  'CULTIVO BACTERIOLÓGICO',
  'ANTIBIOGRAMA',
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const tiposRef = collection(db, 'tipos_estudios');

  const existingSnap = await getDocs(tiposRef);
  const existingNames = new Set(existingSnap.docs.map((d) => (d.data().nombre || '').trim().toUpperCase()));

  let created = 0;
  let skipped = 0;
  for (const nombre of ESTUDIOS) {
    if (existingNames.has(nombre.toUpperCase())) {
      skipped++;
      continue;
    }
    await addDoc(tiposRef, { nombre, descripcion: '' });
    created++;
  }

  console.log(`Listo. Creados: ${created}. Ya existentes (omitidos): ${skipped}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error al cargar el catálogo:', err);
  process.exit(1);
});
