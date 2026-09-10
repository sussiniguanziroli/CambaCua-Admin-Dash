// estudioPdf.js
// Cuerpo del PDF de la solicitud de estudios complementarios sobre el membrete de la doctora.
// Sin dependencias de Firebase ni del navegador: recibe jsPDF/autoTable ya cargados.
import { drawMembrete, getMembreteLayout } from './membrete.js';

const TEXT_COLOR = [45, 45, 45];

export const DATOS_PACIENTE_VACIOS = { pacienteNombre: '', tutorNombre: '', telefono: '', especie: '', raza: '', sexo: '', edad: '' };

// Las solicitudes anteriores a los datos editables no guardaron `datosPaciente`: se toman del perfil.
export const getDatosPaciente = (estudio, paciente) => estudio.datosPaciente || {
    ...DATOS_PACIENTE_VACIOS,
    pacienteNombre: paciente?.name || '',
    tutorNombre: paciente?.tutorName || '',
    especie: paciente?.species || '',
    raza: paciente?.breed || '',
    sexo: paciente?.gender || '',
};

export const formatFechaEstudio = (estudio) => {
    if (estudio.fecha) {
        const [y, m, d] = estudio.fecha.split('-');
        return d ? `${d}/${m}/${y}` : estudio.fecha;
    }
    return estudio.createdAt?.toDate ? estudio.createdAt.toDate().toLocaleDateString('es-AR') : '';
};

export const buildEstudioPDF = (docPdf, autoTable, estudio, paciente) => {
    const W = docPdf.internal.pageSize.getWidth();
    const H = docPdf.internal.pageSize.getHeight();
    const { marginX, contentTop, contentBottom, bodyFontSize } = getMembreteLayout(docPdf);
    const contentWidth = W - marginX * 2;
    let y = contentTop;

    docPdf.setTextColor(...TEXT_COLOR);
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(bodyFontSize);

    const fecha = formatFechaEstudio(estudio);
    if (fecha) docPdf.text(`Corrientes, ${fecha}`, W - marginX, y, { align: 'right' });
    y += bodyFontSize * 2.3;

    // Datos del paciente en dos columnas
    const datos = getDatosPaciente(estudio, paciente);
    const rows = [
        [['Paciente', datos.pacienteNombre], ['Tutor', datos.tutorNombre]],
        [['Especie / Raza', [datos.especie, datos.raza].filter(Boolean).join(' - ')], ['Teléfono', datos.telefono]],
        [['Sexo', datos.sexo], ['Edad', datos.edad]],
    ];
    const colWidth = contentWidth / 2;
    rows.forEach((row) => {
        row.forEach(([label, value], col) => {
            const x = marginX + col * colWidth;
            docPdf.setFont('helvetica', 'bold');
            docPdf.text(`${label}:`, x, y);
            const labelWidth = docPdf.getTextWidth(`${label}: `);
            docPdf.setFont('helvetica', 'normal');
            if (value) docPdf.text(docPdf.splitTextToSize(value, colWidth - labelWidth - 12)[0], x + labelWidth, y);
        });
        y += bodyFontSize * 1.6;
    });

    docPdf.setDrawColor(190, 190, 190);
    docPdf.setLineWidth(0.5);
    docPdf.line(marginX, y - 6, W - marginX, y - 6);
    y += 14;

    const body = (estudio.tipos || []).map((t) => [t.nombre, t.descripcion || '']);
    autoTable(docPdf, {
        startY: y,
        head: [['Estudio', 'Descripción / Indicación']],
        body: body.length > 0 ? body : [['—', '—']],
        styles: { fontSize: bodyFontSize, cellPadding: 6, textColor: TEXT_COLOR },
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        margin: { left: marginX, right: marginX, top: contentTop, bottom: H - contentBottom },
    });
    y = docPdf.lastAutoTable.finalY + bodyFontSize * 2.2;

    const lineHeight = bodyFontSize * 1.35;
    const section = (title, text) => {
        if (!text || !text.trim()) return;
        docPdf.setFontSize(bodyFontSize);
        const lines = docPdf.splitTextToSize(text.trim(), contentWidth);
        if (y + lineHeight * 2 > contentBottom) { docPdf.addPage(); y = contentTop; }
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${title}:`, marginX, y);
        y += lineHeight + 2;
        docPdf.setFont('helvetica', 'normal');
        lines.forEach((line) => {
            if (y > contentBottom) { docPdf.addPage(); y = contentTop; }
            docPdf.text(line, marginX, y);
            y += lineHeight;
        });
        y += 12;
    };
    section('Diagnóstico', estudio.diagnostico);
    section('Notas', estudio.notas);

    // El membrete va en todas las páginas (la tabla o las notas pueden ocupar más de una).
    for (let page = 1; page <= docPdf.getNumberOfPages(); page++) {
        docPdf.setPage(page);
        drawMembrete(docPdf);
    }
    return docPdf;
};
