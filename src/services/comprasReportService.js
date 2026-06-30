// comprasReportService.js
// Exportación del historial de compras de un tutor a PDF y Excel.

const fmtDate = (sale) => (sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString('es-AR') : 'N/A');

const fmtPatients = (sale) => (sale.patientsInfo || []).map((p) => p.name).join(', ') || '—';

const fmtItems = (sale) => (sale.items || [])
    .map((it) => (it.isDoseable ? `${it.name} (${it.quantity} ${it.unit})` : `${it.quantity ?? 1}x ${it.name}`))
    .join('; ') || '—';

// Calcula montos y estado de pago de una venta (misma lógica que TutorProfile).
const computeSale = (sale) => {
    const totalPaid = (sale.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const debtPaid = (sale.debtPayments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const paid = totalPaid + debtPaid;
    const total = sale.total || 0;
    const debt = total - paid;
    let status = 'Pago Parcial';
    if (debt <= 0.01) status = 'Pagado';
    else if (paid < 0.01) status = 'Sin Pagar';
    return { total, paid, debt: debt > 0.01 ? debt : 0, status, subtotal: sale.subtotal || total, discount: sale.discount || 0 };
};

// Ordena por fecha ascendente (las más antiguas primero) para un reporte legible.
const sortByDate = (sales) => [...sales].sort((a, b) => {
    const am = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bm = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return am - bm;
});

export const exportComprasPDF = async (tutor, sales) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
    const margin = 30;
    let y = 50;

    doc.setFontSize(20); doc.text('CambaCuaVet', margin, y); y += 22;
    doc.setFontSize(14); doc.text('Reporte de Compras', margin, y); y += 22;
    doc.setFontSize(11);
    doc.text(`Cliente: ${tutor?.name || 'N/A'}`, margin, y); y += 16;
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, margin, y); y += 16;

    const ordered = sortByDate(sales);
    let grandTotal = 0, grandPaid = 0, grandDebt = 0;

    const body = ordered.map((sale) => {
        const c = computeSale(sale);
        grandTotal += c.total; grandPaid += c.paid; grandDebt += c.debt;
        return [
            sale.comprobante || sale.id.substring(0, 6),
            fmtDate(sale),
            fmtPatients(sale),
            fmtItems(sale),
            `$${c.total.toFixed(2)}`,
            `$${c.paid.toFixed(2)}`,
            `$${c.debt.toFixed(2)}`,
            c.status,
        ];
    });

    autoTable(doc, {
        startY: y + 6,
        head: [['Comprobante', 'Fecha', 'Paciente(s)', 'Items', 'Total', 'Pagado', 'Deuda', 'Estado']],
        body,
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [52, 73, 94] },
        columnStyles: { 3: { cellWidth: 220 } },
        margin: { left: margin, right: margin },
        foot: [['', '', '', 'TOTALES', `$${grandTotal.toFixed(2)}`, `$${grandPaid.toFixed(2)}`, `$${grandDebt.toFixed(2)}`, '']],
        footStyles: { fillColor: [236, 240, 241], textColor: 20, fontStyle: 'bold' },
    });

    doc.save(`Reporte_Compras_${(tutor?.name || 'cliente').replace(/\s+/g, '_')}.pdf`);
};

export const exportComprasExcel = async (tutor, sales) => {
    const XLSX = await import('xlsx');
    const ordered = sortByDate(sales);

    // Hoja 1: una fila por compra + totales.
    const header = ['Comprobante', 'Fecha', 'Paciente(s)', 'Items', 'Subtotal', 'Descuento', 'Total', 'Pagado', 'Deuda', 'Estado'];
    let gTotal = 0, gPaid = 0, gDebt = 0, gSub = 0, gDisc = 0;
    const rows = ordered.map((sale) => {
        const c = computeSale(sale);
        gTotal += c.total; gPaid += c.paid; gDebt += c.debt; gSub += c.subtotal; gDisc += c.discount;
        return [
            sale.comprobante || sale.id.substring(0, 6),
            fmtDate(sale),
            fmtPatients(sale),
            fmtItems(sale),
            c.subtotal, c.discount, c.total, c.paid, c.debt, c.status,
        ];
    });
    const totalsRow = ['', '', '', 'TOTALES', gSub, gDisc, gTotal, gPaid, gDebt, ''];
    const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows, totalsRow]);

    // Hoja 2: una fila por item (detalle).
    const detHeader = ['Comprobante', 'Fecha', 'Paciente(s)', 'Item', 'Cantidad', 'Precio'];
    const detRows = [];
    ordered.forEach((sale) => {
        (sale.items || []).forEach((it) => {
            detRows.push([
                sale.comprobante || sale.id.substring(0, 6),
                fmtDate(sale),
                fmtPatients(sale),
                it.name,
                it.isDoseable ? `${it.quantity} ${it.unit}` : (it.quantity ?? 1),
                it.price || 0,
            ]);
        });
    });
    const ws2 = XLSX.utils.aoa_to_sheet([detHeader, ...detRows]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Compras');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Items');
    XLSX.writeFile(wb, `Reporte_Compras_${(tutor?.name || 'cliente').replace(/\s+/g, '_')}.xlsx`);
};
