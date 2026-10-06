// presupuestoService.js
// Utilidades de los presupuestos (colección `ventas_guardadas`): PDF y antigüedad.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDate = (timestamp) => (timestamp?.toDate ? timestamp.toDate() : null);

// Días calendario desde que se generó el presupuesto ("ayer" es 1 aunque hayan pasado menos de 24 hs).
export const getPresupuestoAgeInDays = (presupuesto) => {
    const created = toDate(presupuesto.createdAt);
    if (!created) return null;
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfCreated = new Date(created).setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((startOfToday - startOfCreated) / MS_PER_DAY));
};

export const formatPresupuestoAge = (presupuesto) => {
    const days = getPresupuestoAgeInDays(presupuesto);
    if (days === null) return '';
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
};

export const getPresupuestoPacientes = (presupuesto) =>
    (presupuesto.patients && presupuesto.patients.length > 0 ? presupuesto.patients : (presupuesto.patient ? [presupuesto.patient] : []));

export const getPresupuestoTotals = (presupuesto) => {
    const cart = presupuesto.cart || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.priceBeforeDiscount || item.price || 0), 0);
    const discount = cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    return { subtotal, discount, total: presupuesto.total || 0 };
};

export const formatCartQuantity = (item) => (item.isDoseable ? `${item.quantity} ${item.unit}` : String(item.quantity ?? 1));

export const generatePresupuestoPDF = async (sale) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 60;

    doc.setFontSize(22);
    doc.text('CambaCuaVet', margin, y);
    y += 25;
    doc.setFontSize(18);
    doc.setTextColor(200, 0, 0);
    doc.text('PRESUPUESTO', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 30;

    doc.setFontSize(12);
    const meta = [
        [`Cliente:`, sale.tutor?.name || 'Cliente Genérico'],
    ];
    if (sale.patient?.name) meta.push(['Paciente:', sale.patient.name]);
    meta.push(['Fecha:', sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString('es-AR') : new Date().toLocaleString('es-AR')]);

    meta.forEach(([k, v]) => { doc.text(`${k} ${v}`, margin, y); y += 18; });
    y += 10;

    const items = (sale.cart || []).map(it => {
        const quantity = formatCartQuantity(it);
        let name = it.name;
        if (it.discountAmount > 0) {
            name += ` (Dto: -$${it.discountAmount.toFixed(2)})`;
        }
        const price = `$${it.price.toFixed(2)}`;
        return [quantity, name, price];
    });

    if (items.length > 0) {
        autoTable(doc, { startY: y, head: [['Cant.', 'Item', 'Subtotal']], body: items, margin: { left: margin, right: margin } });
        y = doc.lastAutoTable.finalY + 15;
    }

    doc.setFontSize(12);
    const { subtotal, discount } = getPresupuestoTotals(sale);

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, margin, y);
    y += 20;
    if (discount > 0) {
        doc.text(`Descuentos: -$${discount.toFixed(2)}`, margin, y);
        y += 20;
    }

    doc.setFontSize(14);
    doc.text(`Total Estimado: $${sale.total.toFixed(2)}`, margin, y);
    y += 30;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Este presupuesto es válido por el día de hoy', margin, y);

    doc.save(`Presupuesto_CambaCuaVet_${sale.id}.pdf`);
};
