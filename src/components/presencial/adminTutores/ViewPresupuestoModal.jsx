import Swal from 'sweetalert2';
import {
    formatPresupuestoAge,
    formatCartQuantity,
    generatePresupuestoPDF,
    getPresupuestoPacientes,
    getPresupuestoTotals,
} from '../../../services/presupuestoService';

const money = (value) => `$${(value || 0).toFixed(2)}`;

// Detalle de un presupuesto guardado: cuándo se generó, qué incluye, y la opción de convertirlo en venta.
const ViewPresupuestoModal = ({ presupuesto, onClose, onLoad }) => {
    if (!presupuesto) return null;

    const created = presupuesto.createdAt?.toDate ? presupuesto.createdAt.toDate() : null;
    const pacientes = getPresupuestoPacientes(presupuesto);
    const cart = presupuesto.cart || [];
    const { subtotal, discount, total } = getPresupuestoTotals(presupuesto);
    const age = formatPresupuestoAge(presupuesto);

    const handleDownload = async () => {
        try {
            await generatePresupuestoPDF(presupuesto);
        } catch (err) {
            console.error('Error generating PDF:', err);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        }
    };

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content view-note-modal recipe-view-modal presupuesto-view-modal">
                <div className="modal-header">
                    <h3>Presupuesto</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="view-note-body">
                    <div className="info-grid">
                        <div className="info-section">
                            <small>Generado</small>
                            <p>
                                {created ? `${created.toLocaleDateString('es-AR')} ${created.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                                {age && <span className="presupuesto-age-badge">{age}</span>}
                            </p>
                        </div>
                        <div className="info-section">
                            <small>Cliente</small>
                            <p>{presupuesto.tutor?.name || 'Cliente Genérico'}</p>
                        </div>
                        <div className="info-section">
                            <small>{pacientes.length > 1 ? 'Pacientes' : 'Paciente'}</small>
                            <p>{pacientes.length > 0 ? pacientes.map((p) => p.name).join(', ') : '—'}</p>
                        </div>
                    </div>

                    <div className="info-section">
                        <small>Items ({cart.length})</small>
                        <table className="prescription-table">
                            <thead>
                                <tr>
                                    <th>Cant.</th>
                                    <th>Item</th>
                                    <th className="presupuesto-col-amount">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => (
                                    <tr key={item.id || index}>
                                        <td>{formatCartQuantity(item)}</td>
                                        <td>
                                            {item.name}
                                            {item.discountAmount > 0 && <span className="presupuesto-item-discount">Dto: -{money(item.discountAmount)}</span>}
                                        </td>
                                        <td className="presupuesto-col-amount">{money(item.price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="presupuesto-totals">
                        <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                        {discount > 0 && <div><span>Descuentos</span><strong>-{money(discount)}</strong></div>}
                        <div className="presupuesto-total-row"><span>Total estimado</span><strong>{money(total)}</strong></div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="btn btn-secondary" onClick={handleDownload}>Descargar PDF</button>
                    <button type="button" className="btn btn-primary" onClick={() => onLoad(presupuesto)}>Cargar Venta</button>
                </div>
            </div>
        </div>
    );
};

export default ViewPresupuestoModal;
