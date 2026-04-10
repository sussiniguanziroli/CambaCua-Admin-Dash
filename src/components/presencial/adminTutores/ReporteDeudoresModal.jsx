import React, { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { FaTimes, FaFileExcel, FaEye, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const ReporteDeudoresModal = ({ onClose }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resumenData, setResumenData] = useState([]); // Para la tabla en el modal
    const [detallesFull, setDetallesFull] = useState([]); // Para el Excel detallado
    const [expandedTutor, setExpandedTutor] = useState(null);

    const procesarDatos = async () => {
        if (!startDate || !endDate) {
            Swal.fire('Atención', 'Seleccioná el rango de fechas.', 'warning');
            return;
        }
        setIsProcessing(true);
        try {
            const start = new Date(startDate); start.setHours(0,0,0,0);
            const end = new Date(endDate); end.setHours(23,59,59,999);

            const [tutoresSnap, ventasSnap] = await Promise.all([
                getDocs(collection(db, "tutores")),
                getDocs(query(collection(db, 'ventas_presenciales'), where('debt', '>', 0)))
            ]);

            const tutoresMap = {};
            tutoresSnap.forEach(doc => { tutoresMap[doc.id] = doc.data(); });

            const tempDetalle = [];
            const tempResumen = {};

            ventasSnap.forEach(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate();
                
                if (createdAt && createdAt >= start && createdAt <= end) {
                    const tutorId = data.tutorInfo?.id || 'generic';
                    const tutorName = data.tutorInfo?.name || 'Cliente Genérico';
                    const tutorData = tutoresMap[tutorId] || {};
                    
                    const ticketInfo = {
                        id: doc.id,
                        fecha: createdAt,
                        monto: data.debt,
                        items: (data.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')
                    };

                    tempDetalle.push({
                        "Tutor": tutorName,
                        "ID Ticket": doc.id,
                        "Fecha": createdAt.toLocaleDateString('es-AR'),
                        "Deuda": data.debt,
                        "Detalle": ticketInfo.items
                    });

                    if (!tempResumen[tutorId]) {
                        tempResumen[tutorId] = {
                            tutorId,
                            nombre: tutorName,
                            telefono: tutorData.phone || 'N/A',
                            tickets: [],
                            totalDeuda: 0
                        };
                    }
                    tempResumen[tutorId].tickets.push(ticketInfo);
                    tempResumen[tutorId].totalDeuda += data.debt;
                }
            });

            const finalResumen = Object.values(tempResumen).sort((a, b) => b.totalDeuda - a.totalDeuda);
            setResumenData(finalResumen);
            setDetallesFull(tempDetalle);
            
            if (finalResumen.length === 0) {
                Swal.fire('Sin deudas', 'No hay tickets impagos en ese período.', 'info');
            }
        } catch (e) {
            Swal.fire('Error', 'Error al procesar.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const descargarExcel = () => {
        const workbook = XLSX.utils.book_new();
        
        // Hoja 1: Resumen con IDs concatenados y Fechas límite
        const hojaResumen = resumenData.map(r => {
            // Ordenar los tickets por fecha para sacar la primera y última deuda
            const ticketsOrdenados = [...r.tickets].sort((a, b) => a.fecha - b.fecha);
            const fechaPrimera = ticketsOrdenados[0].fecha.toLocaleDateString('es-AR');
            const fechaUltima = ticketsOrdenados[ticketsOrdenados.length - 1].fecha.toLocaleDateString('es-AR');

            return {
                "Tutor": r.nombre,
                "Teléfono": r.telefono,
                "Cant. Tickets": r.tickets.length,
                "IDs Tickets": r.tickets.map(t => t.id.substring(0,6)).join(', '),
                "Deuda Total": r.totalDeuda,
                "Fecha Primera Deuda": fechaPrimera,
                "Fecha Última Deuda": fechaUltima
            };
        });
        
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hojaResumen), "Resumen");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detallesFull), "Detalle Tickets");
        XLSX.writeFile(workbook, `Deudores_CambaCua_${startDate}_${endDate}.xlsx`);
    };

    return (
        <div className="reporte-modal-overlay" onClick={onClose}>
            <div className="reporte-modal-content dashboard-variant" onClick={e => e.stopPropagation()}>
                <div className="reporte-modal-header">
                    <h3><FaFileExcel className="excel-icon" /> Dashboard de Deuda</h3>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>
                
                <div className="reporte-modal-body">
                    <div className="controls-row">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <button className="btn btn-primary" onClick={procesarDatos} disabled={isProcessing}>
                            {isProcessing ? 'Buscando...' : 'Ver deudas'}
                        </button>
                    </div>

                    {resumenData.length > 0 && (
                        <div className="preview-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>Tutor</th>
                                        <th>Tickets</th>
                                        <th>Total Deuda</th>
                                        <th>Ver</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resumenData.map(deudor => (
                                        <React.Fragment key={deudor.tutorId}>
                                            <tr className={expandedTutor === deudor.tutorId ? 'expanded' : ''}>
                                                <td>{deudor.nombre}</td>
                                                <td>{deudor.tickets.length}</td>
                                                <td className="debt-cell">${deudor.totalDeuda.toFixed(2)}</td>
                                                <td>
                                                    <button className="btn-icon" onClick={() => setExpandedTutor(expandedTutor === deudor.tutorId ? null : deudor.tutorId)}>
                                                        {expandedTutor === deudor.tutorId ? <FaChevronUp /> : <FaEye />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedTutor === deudor.tutorId && (
                                                <tr className="detail-row">
                                                    <td colSpan="4">
                                                        <div className="ticket-details-box">
                                                            {deudor.tickets.map(t => (
                                                                <div key={t.id} className="ticket-mini-card">
                                                                    <p><strong>ID:</strong> {t.id.substring(0,8)}... | <strong>Fecha:</strong> {t.fecha.toLocaleDateString('es-AR')}</p>
                                                                    <p className="items-text">{t.items}</p>
                                                                    <p className="price-text">${t.monto.toFixed(2)}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="reporte-modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    {resumenData.length > 0 && (
                        <button className="btn btn-success" onClick={descargarExcel}>
                            <FaFileExcel /> Descargar XLSX
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReporteDeudoresModal;