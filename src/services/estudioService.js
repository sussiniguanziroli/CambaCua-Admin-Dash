// estudioService.js
// Catálogo editable de tipos de estudios complementarios (tipos_estudios)
// y generación del PDF de la solicitud (con el membrete de la doctora, ver services/pdf/).
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import scriptFontUrl from '../assets/fonts/GreatVibes-Regular.ttf?url';
import { registerScriptFont } from './pdf/membrete';
import { buildEstudioPDF } from './pdf/estudioPdf';

const tiposRef = collection(db, 'tipos_estudios');

export const getTiposEstudio = async () => {
    const snap = await getDocs(query(tiposRef, orderBy('nombre', 'asc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addTipoEstudio = async (nombre, descripcion) => {
    const ref = await addDoc(tiposRef, { nombre: nombre.trim(), descripcion: (descripcion || '').trim() });
    return { id: ref.id, nombre: nombre.trim(), descripcion: (descripcion || '').trim() };
};

export const deleteTipoEstudio = async (tipoId) => {
    await deleteDoc(doc(db, 'tipos_estudios', tipoId));
};

const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
};

// La fuente del membrete se descarga una sola vez (y solo al imprimir).
let scriptFontPromise = null;
const loadScriptFont = () => {
    if (!scriptFontPromise) {
        scriptFontPromise = fetch(scriptFontUrl)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then(arrayBufferToBase64)
            .catch((err) => {
                console.warn('No se pudo cargar la fuente del membrete; se usa una alternativa.', err);
                scriptFontPromise = null;
                return null;
            });
    }
    return scriptFontPromise;
};

export const generateEstudioPDF = async (estudio, paciente) => {
    const [{ jsPDF }, autoTableModule, scriptFont] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadScriptFont(),
    ]);

    const docPdf = new jsPDF({ unit: 'pt', format: 'a4' });
    if (scriptFont) registerScriptFont(docPdf, scriptFont);
    buildEstudioPDF(docPdf, autoTableModule.default, estudio, paciente);

    const nombre = estudio.datosPaciente?.pacienteNombre || paciente?.name || 'paciente';
    docPdf.save(`Estudios_${nombre.replace(/\s+/g, '_')}_${estudio.fecha || ''}.pdf`);
};
