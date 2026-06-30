// estudioService.js
// Catálogo editable de tipos de estudios complementarios (tipos_estudios)
// y generación del PDF de la solicitud.
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';

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

export const generateEstudioPDF = async (estudio, paciente) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const docPdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 60;

    docPdf.setFontSize(20); docPdf.text('CambaCuaVet', margin, y); y += 24;
    docPdf.setFontSize(15); docPdf.text('Solicitud de Estudios Complementarios', margin, y); y += 30;

    docPdf.setFontSize(11);
    const fecha = estudio.fecha || (estudio.createdAt?.toDate ? estudio.createdAt.toDate().toLocaleDateString('es-AR') : '');
    const meta = [
        ['Paciente:', paciente?.name || 'N/A'],
        ['Especie/Raza:', `${paciente?.species || ''} ${paciente?.breed ? `- ${paciente.breed}` : ''}`.trim() || 'N/A'],
        ['Tutor:', paciente?.tutorName || 'N/A'],
        ['Fecha:', fecha || 'N/A'],
        ['Solicitado por:', estudio.solicitadoPor || 'N/A'],
    ];
    meta.forEach(([k, v]) => { docPdf.text(`${k} ${v}`, margin, y); y += 18; });
    y += 12;

    const body = (estudio.tipos || []).map((t) => [t.nombre, t.descripcion || '']);
    autoTable(docPdf, {
        startY: y,
        head: [['Estudio', 'Descripción / Indicación']],
        body: body.length > 0 ? body : [['—', '—']],
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [52, 73, 94] },
        margin: { left: margin, right: margin },
    });
    y = docPdf.lastAutoTable.finalY + 20;

    if (estudio.notas) {
        docPdf.setFontSize(12); docPdf.text('Notas:', margin, y); y += 18;
        docPdf.setFontSize(10);
        const lines = docPdf.splitTextToSize(estudio.notas, docPdf.internal.pageSize.getWidth() - margin * 2);
        docPdf.text(lines, margin, y);
    }

    docPdf.save(`Estudios_${(paciente?.name || 'paciente').replace(/\s+/g, '_')}_${fecha || ''}.pdf`);
};
