import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDailyTransactions } from '../../services/cashFlowService';
import SaleDetailModal from './SaleDetailModal';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { db } from '../../firebase/config';
import { doc, writeBatch, increment, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

const FaFileInvoiceDollar = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M320 0H64C28.7 0 0 28.7 0 64v384c0 35.3 28.7 64 64 64h256c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zM192 416c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm32-160h-64c-8.8 0-16-7.2-16-16s7.2-16 16-16h64c8.8 0 16 7.2 16 16s-7.2 16-16 16zm48-96H112c-8.8 0-16-7.2-16-16s7.2-16 16-16h160c8.8 0 16 7.2 16 16s-7.2 16-16 16z"></path></svg>;
const FaHandHoldingUsd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M528.3 22.8c-20.7-20.7-54.3-20.7-75 0L320 156.2l-32.3-32.3c-27.5-27.5-72.2-27.5-99.7 0l-112 112c-27.5 27.5-27.5 72.2 0 99.7l32.3 32.3L22.8 503.7c-20.7 20.7-20.7 54.3 0 75s54.3 20.7 75 0l133.3-133.3 32.3 32.3c27.5 27.5 72.2 27.5 99.7 0l112-112c27.5-27.5 27.5-72.2 0-99.7l-32.3-32.3L528.3 97.8c20.7-20.7 20.7-54.3 0-75zM224 288c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;
const FaTrash = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32l21.2 339z"></path></svg>;
const FaPencilAlt = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-12.3 4.7-17 0l-111-111c-4.7-4.7-4.7-12.3 0-17l46.1-46.1c18.7-18.7 49.1-18.7 67.9 0l60.1 60.1c18.8 18.7 18.8 49.1 0 67.9zM284.2 99.8L21.6 362.4.4 483.9c-2.9 16.4 11.4 30.6 27.8 27.8l121.5-21.3 262.6-262.6c4.7-4.7 4.7-12.3 0-17l-111-111c-4.8-4.7-12.4-4.7-17.1 0zM124.1 339.9l-5.5-5.5 53.5-53.5 11.1 11.1-59.1 47.9z"></path></svg>;


const cancelSale = async (sale) => {
    if (sale.type !== 'Venta Presencial' && sale.type !== 'Pedido Online') {
        throw new Error("Solo se pueden cancelar ventas o pedidos.");
    }
    
    const batch = writeBatch(db);
    
    const saleRef = doc(db, 'ventas_presenciales', sale.id);

    if (sale.items) {
        sale.items.forEach(item => {
            if (item.source === 'online' && !item.isDoseable) {
                const productRef = doc(db, 'productos', item.id);
                batch.update(productRef, { stock: increment(item.quantity) });
            }
        });
    }

    if (sale.patientInfo?.id) {
        const patientId = sale.patientInfo.id;
        
        const clinicalNoteQuery = query(
            collection(db, `pacientes/${patientId}/clinical_history`),
            where("saleId", "==", sale.id)
        );
        const clinicalNotesSnap = await getDocs(clinicalNoteQuery);
        clinicalNotesSnap.forEach(doc => batch.delete(doc.ref));

        const vencimientosQuery = query(
            collection(db, `pacientes/${patientId}/vencimientos`),
            where("saleId", "==", sale.id)
        );
        const vencimientosSnap = await getDocs(vencimientosQuery);
        vencimientosSnap.forEach(doc => batch.delete(doc.ref));
    }

    if (sale.debt > 0 && sale.tutorInfo?.id) {
        const tutorRef = doc(db, "tutores", sale.tutorInfo.id);
        batch.update(tutorRef, {
          accountBalance: increment(sale.debt),
        });
    }

    batch.delete(saleRef);
    
    await batch.commit();
};


const CajaDiaria = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [filterType, setFilterType] = useState('Todos');
    const [filterMethod, setFilterMethod] = useState('Todos');
    const navigate = useNavigate();

    const fetchAndSetTransactions = useCallback(async (date) => {
        setIsLoading(true);
        const data = await fetchDailyTransactions(date);
        setTransactions(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAndSetTransactions(selectedDate);
    }, [selectedDate, fetchAndSetTransactions]);

    const summary = useMemo(() => {
        return transactions.reduce((acc, trans) => {
            if (trans.type === 'Venta Presencial' || trans.type === 'Pedido Online') {
                acc.subtotalVendido += trans.subtotal || trans.total;
                acc.totalDescuentos += trans.discount || 0;
                acc.deudaGenerada += trans.debt || 0;
                (trans.payments || []).forEach(p => {
                    acc.metodos[p.method] = (acc.metodos[p.method] || 0) + parseFloat(p.amount);
                });
            } else if (trans.type === 'Cobro Deuda') {
                acc.deudaCobrada += trans.amount;
                acc.metodos[trans.paymentMethod] = (acc.metodos[trans.paymentMethod] || 0) + trans.amount;
            }
            return acc;
        }, { subtotalVendido: 0, totalDescuentos: 0, deudaGenerada: 0, deudaCobrada: 0, metodos: {} });
    }, [transactions]);

    const totalEnCaja = useMemo(() => {
        return Object.values(summary.metodos).reduce((sum, val) => sum + val, 0);
    }, [summary.metodos]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const typeOk = filterType === 'Todos' || t.type === filterType;
            const methodOk = filterMethod === 'Todos' || (t.paymentMethod === filterMethod || (t.payments || []).some(p => p.method === filterMethod));
            return typeOk && methodOk;
        });
    }, [transactions, filterType, filterMethod]);
    
    const formatDateForInput = (date) => {
        const d = new Date(date);
        const offset = d.getTimezoneOffset();
        const adjustedDate = new Date(d.getTime() - (offset*60*1000));
        return adjustedDate.toISOString().split('T')[0];
    };

    const uniqueTypes = ['Todos', ...new Set(transactions.map(t => t.type))];
    const uniqueMethods = ['Todos', ...new Set(transactions.flatMap(t => t.paymentMethod ? [t.paymentMethod] : (t.payments || []).map(p => p.method)))];

    const handleDeleteSale = (e, sale) => {
        e.stopPropagation();
        if (sale.type !== 'Venta Presencial' && sale.type !== 'Pedido Online') {
            Swal.fire('Acción no permitida', 'Solo las ventas pueden ser canceladas. Los cobros de deuda deben anularse desde la cuenta del tutor.', 'warning');
            return;
        }

        Swal.fire({
            title: '¿Cancelar esta Venta?',
            text: "Esta acción anulará la venta, repondrá el stock, eliminará la deuda generada y las notas de historia clínica. Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡Cancelar Venta!',
            cancelButtonText: 'No'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    setIsLoading(true);
                    await cancelSale(sale);
                    Swal.fire('Venta Cancelada', 'La venta ha sido revertida exitosamente.', 'success');
                    fetchAndSetTransactions(selectedDate);
                } catch (error) {
                    console.error("Error cancelling sale: ", error);
                    Swal.fire('Error', 'No se pudo cancelar la venta. ' + error.message, 'error');
                    setIsLoading(false);
                }
            }
        });
    };

    const handleEditSale = (e, sale) => {
        e.stopPropagation();
        if (sale.type !== 'Venta Presencial' && sale.type !== 'Pedido Online') {
            Swal.fire('Acción no permitida', 'Solo las ventas pueden ser editadas.', 'warning');
            return;
        }

        Swal.fire({
            title: '¿Editar esta Venta?',
            text: "Para editar, la venta original será CANCELADA y se abrirá una nueva venta pre-cargada con los datos anteriores. Deberá confirmar la nueva venta.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, Cancelar y Editar',
            cancelButtonText: 'No'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    setIsLoading(true);
                    await cancelSale(sale);
                    navigate('/admin/vender', { 
                        state: { 
                            tutor: sale.tutorInfo, 
                            patient: sale.patientInfo, 
                            cart: sale.items 
                        } 
                    });
                } catch (error) {
                    console.error("Error preparing to edit sale: ", error);
                    Swal.fire('Error', 'No se pudo iniciar la edición. ' + error.message, 'error');
                    setIsLoading(false);
                }
            }
        });
    };

    return (
        <div className="caja-diaria-container">
            {selectedTransaction && <SaleDetailModal sale={selectedTransaction} onClose={() => setSelectedTransaction(null)} />}
            <div className="caja-page-header">
                <h1>Caja Diaria</h1>
                <div className="caja-date-picker">
                    <label htmlFor="sale-date">Seleccionar Fecha:</label>
                    <input type="date" id="sale-date" value={formatDateForInput(selectedDate)} onChange={e => {
                        const newDate = new Date(e.target.value);
                        const offset = newDate.getTimezoneOffset() * 60000;
                        setSelectedDate(new Date(newDate.getTime() + offset));
                    }}/>
                </div>
            </div>
             <div className="caja-filters">
                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                    {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            <div className="caja-summary-grid">
                <div className="caja-summary-card total-caja"><span>Total en Caja</span><strong>${totalEnCaja.toFixed(2)}</strong></div>
                <div className="caja-summary-card"><span>Subtotal Vendido</span><strong>${summary.subtotalVendido.toFixed(2)}</strong></div>
                {summary.totalDescuentos > 0 && (
                    <div className="caja-summary-card descuentos"><span>Descuentos</span><strong>-${summary.totalDescuentos.toFixed(2)}</strong></div>
                )}
                <div className="caja-summary-card deuda-cobrada"><span>Cobranza de Deuda</span><strong>${summary.deudaCobrada.toFixed(2)}</strong></div>
                <div className="caja-summary-card deuda-generada"><span>Deuda Generada</span><strong>${summary.deudaGenerada.toFixed(2)}</strong></div>
                {Object.entries(summary.metodos).map(([method, total]) => (
                    <div className="caja-summary-card" key={method}><span>{method}</span><strong>${total.toFixed(2)}</strong></div>
                ))}
            </div>
            <div className="caja-transactions-list">
                <h3>Transacciones del Día ({filteredTransactions.length})</h3>
                {isLoading ? <p>Cargando...</p> : (
                    filteredTransactions.length > 0 ? (
                        <div className="caja-grid">
                            {filteredTransactions.map(trans => (
                                <div key={trans.id} className="caja-transaction-card" onClick={() => setSelectedTransaction(trans)}>
                                    <div className="card-header">
                                        <span className={`type-badge ${trans.type.includes('Venta') || trans.type.includes('Pedido') ? 'venta' : 'cobro'}`}>
                                            {trans.type.includes('Venta') || trans.type.includes('Pedido') ? <FaFileInvoiceDollar/> : <FaHandHoldingUsd/>}
                                            {trans.type}
                                        </span>
                                        <span className="time">{trans.createdAt.toDate().toLocaleTimeString('es-AR')}</span>
                                    </div>
                                    <div className="card-body">
                                        <p className="customer">
                                            {trans.tutorInfo?.id ? (
                                                <Link 
                                                className='link-class'
                                                    to={`/admin/tutor-profile/${trans.tutorInfo.id}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Ver perfil del tutor"
                                                >
                                                    {trans.tutorInfo.name || trans.tutorName || 'Tutor'}
                                                </Link>
                                            ) : (
                                                trans.tutorInfo?.name || trans.tutorName || 'N/A'
                                            )}
                                        </p>
                                        <p className="details">
                                            {trans.patientInfo?.id && (
                                                <>
                                                    <Link 
                                                    className='link-class'
                                                        to={`/admin/paciente-profile/${trans.patientInfo.id}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Ver perfil del paciente"
                                                    >
                                                        {trans.patientInfo.name || 'Paciente'}
                                                    </Link>
                                                    {' / '}
                                                </>
                                            )}
                                            {trans.type === 'Cobro Deuda' ? `Pagó con ${trans.paymentMethod}` : 
                                             (trans.payments && trans.payments.length > 0) ? `${trans.payments.length} método(s) de pago` :
                                             (trans.paymentMethod || 'N/A')}
                                        </p>
                                    </div>
                                    <div className="card-footer">
                                        <span className="total">${(trans.total || trans.amount).toFixed(2)}</span>
                                        { (trans.type === 'Venta Presencial' || trans.type === 'Pedido Online') &&
                                            <div className="card-actions">
                                                <button title="Editar Venta" className="btn edit" onClick={(e) => handleEditSale(e, trans)}><FaPencilAlt/></button>
                                                <button title="Cancelar Venta" className="btn delete" onClick={(e) => handleDeleteSale(e, trans)}><FaTrash/></button>
                                            </div>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="no-results-message">No se encontraron transacciones para esta fecha.</p>
                )}
            </div>
        </div>
    );
};

export default CajaDiaria;