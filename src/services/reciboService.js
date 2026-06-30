// reciboService.js
// Emisión de recibos de pago electrónicos (en lote) y generación de su PDF.
import { db } from '../firebase/config';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { reserveComprobanteRange } from './comprobanteService';

const buildConcept = (sale) => {
    const items = sale.items || [];
    if (items.length === 0) return 'Venta sin items';
    const first = items[0].name;
    return items.length > 1 ? `${first} y ${items.length - 1} más` : first;
};

/**
 * Emite un recibo por cada venta seleccionada, con número consecutivo (R...).
 * Guarda cada recibo en la colección `recibos` y devuelve la lista creada (para el PDF).
 *
 * @param {{id:string,name:string}} tutor
 * @param {Array<object>} sales ventas pagas seleccionadas
 * @returns {Promise<Array<object>>}
 */
export const emitRecibosForSales = async (tutor, sales) => {
    if (!sales || sales.length === 0) return [];

    const numbers = await reserveComprobanteRange('recibos', sales.length);
    const batch = writeBatch(db);
    const created = [];

    sales.forEach((sale, i) => {
        const { numero, code } = numbers[i];
        const reciboRef = doc(collection(db, 'recibos'));
        const reciboData = {
            numero,
            comprobante: code,
            tutorId: tutor.id,
            tutorName: tutor.name,
            saleId: sale.id,
            saleComprobante: sale.comprobante || null,
            saleDate: sale.createdAt || null,
            concept: buildConcept(sale),
            amount: sale.total || 0,
            paymentMethods: (sale.payments || []).map((p) => p.method).filter(Boolean),
            createdAt: serverTimestamp(),
        };
        batch.set(reciboRef, reciboData);
        created.push({ id: reciboRef.id, ...reciboData, createdAt: new Date() });
    });

    await batch.commit();
    return created;
};

/**
 * Genera un PDF con un recibo por página para los recibos indicados.
 */
export const generateRecibosPDF = async (recibos, tutor) => {
    const { jsPDF } = await import('jspdf');
    const docPdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = docPdf.internal.pageSize.getWidth();

    recibos.forEach((recibo, index) => {
        if (index > 0) docPdf.addPage();
        let y = 70;

        docPdf.setFontSize(22);
        docPdf.text('CambaCuaVet', margin, y); y += 26;
        docPdf.setFontSize(16);
        docPdf.text('Recibo de Pago', margin, y);
        docPdf.setFontSize(14);
        docPdf.text(recibo.comprobante || '', pageWidth - margin, y, { align: 'right' });
        y += 34;

        docPdf.setDrawColor(200);
        docPdf.line(margin, y, pageWidth - margin, y); y += 24;

        docPdf.setFontSize(12);
        const fecha = recibo.createdAt?.toDate
            ? recibo.createdAt.toDate().toLocaleDateString('es-AR')
            : (recibo.createdAt instanceof Date ? recibo.createdAt.toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR'));
        const rows = [
            ['Recibí de:', tutor?.name || recibo.tutorName || 'N/A'],
            ['Fecha:', fecha],
            ['En concepto de:', recibo.concept || 'N/A'],
        ];
        if (recibo.saleComprobante) rows.push(['Venta asociada:', recibo.saleComprobante]);
        if (recibo.paymentMethods?.length) rows.push(['Forma de pago:', recibo.paymentMethods.join(', ')]);
        rows.forEach(([k, v]) => { docPdf.text(`${k} ${v}`, margin, y); y += 22; });

        y += 16;
        docPdf.setFontSize(16);
        docPdf.text(`Total recibido: $${(recibo.amount || 0).toFixed(2)}`, margin, y);

        y += 70;
        docPdf.setFontSize(11);
        docPdf.setTextColor(120);
        docPdf.text('Firma y aclaración', pageWidth - margin - 160, y);
        docPdf.line(pageWidth - margin - 180, y - 8, pageWidth - margin, y - 8);
        docPdf.setTextColor(0);
    });

    const fileName = recibos.length === 1
        ? `Recibo_${recibos[0].comprobante}.pdf`
        : `Recibos_CambaCuaVet_${new Date().toISOString().split('T')[0]}.pdf`;
    docPdf.save(fileName);
};
