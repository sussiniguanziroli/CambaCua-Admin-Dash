import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FaTimes, FaTrash, FaEdit, FaFileDownload } from 'react-icons/fa';
import { generatePresupuestoPDF } from '../../services/presupuestoService';

const VentasGuardadasModal = ({ isOpen, onClose, selectedDate, onLoadSale }) => {
    const [savedSales, setSavedSales] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSavedSales();
        }
    }, [isOpen, selectedDate]);

    const fetchSavedSales = async () => {
        setIsLoading(true);
        try {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const q = query(
                collection(db, 'ventas_guardadas'),
                where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
                where('createdAt', '<=', Timestamp.fromDate(endOfDay))
            );

            const snapshot = await getDocs(q);
            const sales = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setSavedSales(sales);
        } catch (error) {
            console.error('Error fetching saved sales:', error);
            Swal.fire('Error', 'No se pudieron cargar las ventas guardadas', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSale = async (saleId, e) => {
        e.stopPropagation();
        
        const result = await Swal.fire({
            title: '¿Eliminar venta guardada?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d'
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'ventas_guardadas', saleId));
                await fetchSavedSales();
                Swal.fire('Eliminada', 'La venta guardada ha sido eliminada', 'success');
            } catch (error) {
                console.error('Error deleting saved sale:', error);
                Swal.fire('Error', 'No se pudo eliminar la venta guardada', 'error');
            }
        }
    };

    const handleLoadForEdit = (sale, e) => {
        e.stopPropagation();
        onLoadSale(sale, 3);
        onClose();
    };

    const handleLoadForPayment = (sale, e) => {
        e.stopPropagation();
        onLoadSale(sale, 4);
        onClose();
    };

    const handleDownloadPDF = async (sale, e) => {
        e.stopPropagation();

        try {
            await generatePresupuestoPDF(sale);
        } catch (err) {
            console.error("Error generating PDF:", err);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="sale-detail-modal-overlay">
            <div className="ventas-guardadas-modal" role="dialog" aria-modal="true">
                <button className="sale-detail-close-btn" onClick={onClose} aria-label="Cerrar">
                    <FaTimes />
                </button>
                <h3>Presupuestos - {selectedDate.toLocaleDateString('es-AR')}</h3>

                <div className="ventas-guardadas-body">
                    {isLoading ? (
                        <p>Cargando presupuestos...</p>
                    ) : savedSales.length === 0 ? (
                        <p className="no-results-message">No hay ventas guardadas para este día</p>
                    ) : (
                        <div className="ventas-guardadas-list">
                            {savedSales.map(sale => (
                                <div key={sale.id} className="venta-guardada-card">
                                    <div className="venta-guardada-info">
                                        <div className="venta-guardada-header">
                                            <span className="venta-guardada-time">
                                                {sale.createdAt?.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="venta-guardada-total">${sale.total.toFixed(2)}</span>
                                        </div>
                                        <div className="venta-guardada-details">
                                            <p><strong>Tutor:</strong> {sale.tutor?.name || 'Cliente Genérico'}</p>
                                            {sale.patient && <p><strong>Paciente:</strong> {sale.patient.name}</p>}
                                            <p><strong>Items:</strong> {sale.cart.length}</p>
                                        </div>
                                    </div>
                                    <div className="venta-guardada-actions">
                                        <button 
                                            className="btn btn-icon" 
                                            onClick={(e) => handleDownloadPDF(sale, e)}
                                            title="Descargar PDF"
                                        >
                                            <FaFileDownload />
                                        </button>
                                        <button 
                                            className="btn btn-icon" 
                                            onClick={(e) => handleLoadForEdit(sale, e)}
                                            title="Editar Venta"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button 
                                            className="btn btn-primary btn-sm" 
                                            onClick={(e) => handleLoadForPayment(sale, e)}
                                        >
                                            Cargar Venta
                                        </button>
                                        <button 
                                            className="btn btn-icon btn-danger" 
                                            onClick={(e) => handleDeleteSale(sale.id, e)}
                                            title="Eliminar"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VentasGuardadasModal;