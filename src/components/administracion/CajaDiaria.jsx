import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDailyTransactions } from '../../services/cashFlowService';
import SaleDetailModal from './SaleDetailModal';
import CajaDetailPopup from './CajaDetailPopup';
import VentasGuardadasModal from './VentasGuardadasModal';
import PaySaleDebtModal from './PaySaleDebtModal';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { db } from '../../firebase/config';
import { doc, writeBatch, increment, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { FaFileInvoiceDollar, FaHandHoldingUsd, FaPencilAlt, FaTrash, FaSave, FaExclamationTriangle, FaMoneyBillWave, FaTh, FaList } from 'react-icons/fa';

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

const deleteCobro = async (cobro) => {
    const batch = writeBatch(db);

    const cobroRef = doc(db, 'cobros_deuda', cobro.id);
    batch.delete(cobroRef);

    if (cobro.tutorId) {
        const tutorRef = doc(db, 'tutores', cobro.tutorId);
        batch.update(tutorRef, {
            accountBalance: increment(-parseFloat(cobro.amount))
        });
    }

    await batch.commit();
};

const CajaDiaria = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [filterType, setFilterType] = useState('Todos');
    const [filterMethod, setFilterMethod] = useState('Todos');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('Todos');
    const [popupData, setPopupData] = useState(null);
    const [isVentasGuardadasOpen, setIsVentasGuardadasOpen] = useState(false);
    const [saleToPayDebt, setSaleToPayDebt] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const navigate = useNavigate();

    const formatCurrency = (number) => {
        const num = parseFloat(number) || 0;
        return num.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

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
                const saleSubtotal = trans.subtotal || trans.total;
                acc.subtotalVendido += saleSubtotal;
                acc.balanceDiario += saleSubtotal;
                acc.totalDescuentos += trans.discount || 0;
                acc.deudaGenerada += trans.debt || 0;
                
                (trans.payments || []).forEach(p => {
                    const amount = parseFloat(p.amount);
                    if (p.method === 'Efectivo') {
                        acc.totalEfectivo += amount;
                    } else {
                        acc.totalElectronico += amount;
                    }
                });
            } else if (trans.type === 'Cobro Deuda') {
                const amount = parseFloat(trans.amount);
                acc.deudaCobrada += amount;
                if (trans.paymentMethod === 'Efectivo') {
                    acc.totalEfectivo += amount;
                } else {
                    acc.totalElectronico += amount;
                }
            }
            return acc;
        }, { 
            subtotalVendido: 0, 
            totalDescuentos: 0, 
            deudaGenerada: 0, 
            deudaCobrada: 0,
            totalEfectivo: 0,
            totalElectronico: 0,
            balanceDiario: 0
        });
    }, [transactions]);

    const totalEnCaja = useMemo(() => {
        return summary.totalEfectivo + summary.totalElectronico;
    }, [summary.totalEfectivo, summary.totalElectronico]);

    const summaryDetails = useMemo(() => {
        const metodosElectronicos = {};
        const metodosCobranza = {};
        let ventasEfectivo = 0;
        let cobrosEfectivo = 0;
        let ventasDeuda = 0;
        let ventasSubtotal = 0;

        transactions.forEach(trans => {
            if (trans.type === 'Venta Presencial' || trans.type === 'Pedido Online') {
                ventasSubtotal += trans.subtotal || trans.total;
                ventasDeuda += trans.debt || 0;
                (trans.payments || []).forEach(p => {
                    const amount = parseFloat(p.amount);
                    if (p.method === 'Efectivo') {
                        ventasEfectivo += amount;
                    } else {
                        metodosElectronicos[p.method] = (metodosElectronicos[p.method] || 0) + amount;
                    }
                });
            } else if (trans.type === 'Cobro Deuda') {
                const amount = parseFloat(trans.amount);
                metodosCobranza[trans.paymentMethod] = (metodosCobranza[trans.paymentMethod] || 0) + amount;
                if (trans.paymentMethod === 'Efectivo') {
                    cobrosEfectivo += amount;
                } else {
                    metodosElectronicos[trans.paymentMethod] = (metodosElectronicos[trans.paymentMethod] || 0) + amount;
                }
            }
        });

        const formatBreakdown = (obj) => Object.entries(obj).map(([label, value]) => ({
            label, value: `$${formatCurrency(value)}`
        })).sort((a, b) => b.value.localeCompare(a.value));

        return {
            totalCaja: {
                title: "Total en Caja",
                total: `$${formatCurrency(totalEnCaja)}`,
                breakdown: [
                    { label: "Total Efectivo", value: `$${formatCurrency(summary.totalEfectivo)}` },
                    { label: "Total Electrónico", value: `$${formatCurrency(summary.totalElectronico)}` }
                ]
            },
            totalElectronico: {
                title: "Total Electrónico",
                total: `$${formatCurrency(summary.totalElectronico)}`,
                breakdown: formatBreakdown(metodosElectronicos)
            },
            totalEfectivo: {
                title: "Total Efectivo",
                total: `$${formatCurrency(summary.totalEfectivo)}`,
                breakdown: [
                    { label: "Ingreso por Ventas", value: `$${formatCurrency(ventasEfectivo)}` },
                    { label: "Ingreso por Cobranzas", value: `$${formatCurrency(cobrosEfectivo)}` }
                ]
            },
            balanceDiario: {
                title: "Balance Diario (Ventas)",
                total: `$${formatCurrency(summary.balanceDiario)}`,
                breakdown: [
                    { label: "Ventas Totales del Día", value: `$${formatCurrency(ventasSubtotal)}` },
                    { label: "Generado en Cta. Cte.", value: `-$${formatCurrency(ventasDeuda)}` },
                    { label: "Ventas Cobradas Hoy", value: `$${formatCurrency(ventasSubtotal - ventasDeuda)}` }
                ]
            },
            deudaCobrada: {
                title: "Cobranza de Deuda",
                total: `$${formatCurrency(summary.deudaCobrada)}`,
                breakdown: formatBreakdown(metodosCobranza)
            },
            deudaGenerada: {
                title: "Deuda Generada",
                total: `$${formatCurrency(summary.deudaGenerada)}`,
                breakdown: [
                    { label: "Ventas en Cta. Cte.", value: `$${formatCurrency(summary.deudaGenerada)}` }
                ]
            },
            descuentos: {
                title: "Descuentos",
                total: `-$${formatCurrency(summary.totalDescuentos)}`,
                breakdown: [
                    { label: "Descuentos Aplicados", value: `-$${formatCurrency(summary.totalDescuentos)}` }
                ]
            }
        };
    }, [transactions, summary, totalEnCaja]);

    const getPaymentStatus = (trans) => {
        if (trans.type === 'Cobro Deuda') return 'paid';
        
        const debt = trans.debt || 0;
        const total = trans.total || 0;
        const paid = (trans.payments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        if (debt === 0 || Math.abs(debt) < 0.01) return 'paid';
        if (paid === 0 || Math.abs(paid) < 0.01) return 'unpaid';
        if (debt > 0 && paid > 0) return 'partial';
        return 'paid';
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const typeOk = filterType === 'Todos' || t.type === filterType;
            const methodOk = filterMethod === 'Todos' || (t.paymentMethod === filterMethod || (t.payments || []).some(p => p.method === filterMethod));
            
            let statusOk = true;
            if (filterPaymentStatus !== 'Todos') {
                const status = getPaymentStatus(t);
                statusOk = filterPaymentStatus === status;
            }
            
            return typeOk && methodOk && statusOk;
        });
    }, [transactions, filterType, filterMethod, filterPaymentStatus]);
    
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

    const handleDeleteCobro = (e, cobro) => {
        e.stopPropagation();

        Swal.fire({
            title: '¿Anular este Cobro?',
            html: `Esta acción eliminará el cobro de <strong>$${formatCurrency(cobro.amount)}</strong> y revertirá el saldo de la cuenta corriente de <strong>${cobro.tutorName}</strong>. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar'
        }).then(async (firstResult) => {
            if (!firstResult.isConfirmed) return;

            const { value: password } = await Swal.fire({
                title: 'Ingrese la contraseña',
                input: 'password',
                inputLabel: 'Esta operación requiere autorización',
                inputPlaceholder: 'Contraseña',
                inputAttributes: { autocomplete: 'off' },
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Verificar',
                cancelButtonText: 'Cancelar',
                preConfirm: (val) => {
                    if (val !== '1234') {
                        Swal.showValidationMessage('Contraseña incorrecta');
                        return false;
                    }
                    return true;
                }
            });

            if (!password) return;

            const secondConfirm = await Swal.fire({
                title: '¿Está completamente seguro?',
                text: 'Esta es la confirmación final. El cobro será eliminado permanentemente.',
                icon: 'error',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, anular cobro',
                cancelButtonText: 'No, volver'
            });

            if (!secondConfirm.isConfirmed) return;

            try {
                setIsLoading(true);
                await deleteCobro(cobro);
                Swal.fire('Cobro Anulado', 'El cobro ha sido eliminado y el saldo revertido.', 'success');
                fetchAndSetTransactions(selectedDate);
            } catch (error) {
                console.error("Error deleting cobro: ", error);
                Swal.fire('Error', 'No se pudo anular el cobro. ' + error.message, 'error');
                setIsLoading(false);
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

    const handleLoadSale = (sale, step) => {
        navigate('/admin/vender', {
            state: {
                savedSale: sale,
                loadStep: step
            }
        });
    };

    const handlePayDebt = (e, sale) => {
        e.stopPropagation();
        setSaleToPayDebt(sale);
    };

    const handlePaymentComplete = () => {
        fetchAndSetTransactions(selectedDate);
    };

    return (
        <div className="caja-diaria-container">
            {selectedTransaction && <SaleDetailModal sale={selectedTransaction} onClose={() => setSelectedTransaction(null)} />}
            {popupData && <CajaDetailPopup data={popupData} onClose={() => setPopupData(null)} />}
            <VentasGuardadasModal 
                isOpen={isVentasGuardadasOpen} 
                onClose={() => setIsVentasGuardadasOpen(false)}
                selectedDate={selectedDate}
                onLoadSale={handleLoadSale}
            />
            {saleToPayDebt && (
                <PaySaleDebtModal
                    sale={saleToPayDebt}
                    onClose={() => setSaleToPayDebt(null)}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}

            <div className="caja-page-header">
                <h1>Caja Diaria</h1>
                <div className="caja-header-actions">
                    <button 
                        className="btn btn-ventas-guardadas"
                        onClick={() => setIsVentasGuardadasOpen(true)}
                    >
                        <FaSave /> Prespuestos de Hoy
                    </button>
                    <div className="caja-date-picker">
                        <label htmlFor="sale-date">Seleccionar Fecha:</label>
                        <input type="date" id="sale-date" value={formatDateForInput(selectedDate)} onChange={e => {
                            const newDate = new Date(e.target.value);
                            const offset = newDate.getTimezoneOffset() * 60000;
                            setSelectedDate(new Date(newDate.getTime() + offset));
                        }}/>
                    </div>
                </div>
            </div>

            <div className="caja-filters">
                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                    {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterPaymentStatus} onChange={e => setFilterPaymentStatus(e.target.value)}>
                    <option value="Todos">Todos los Estados</option>
                    <option value="paid">Pagado Completo</option>
                    <option value="partial">Pago Parcial</option>
                    <option value="unpaid">Sin Pagar</option>
                </select>
                <button 
                    className="btn-view-toggle"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    title={viewMode === 'grid' ? 'Vista de Lista' : 'Vista de Cajas'}
                >
                    {viewMode === 'grid' ? <FaList /> : <FaTh />}
                </button>
            </div>

            <div className="caja-summary-main">
                <div 
                    className="caja-summary-card total-caja" 
                    onClick={() => setPopupData(summaryDetails.totalCaja)}
                >
                    <span>Total en Caja</span>
                    <strong>${formatCurrency(totalEnCaja)}</strong>
                </div>
                <div 
                    className="caja-summary-card total-electronico"
                    onClick={() => setPopupData(summaryDetails.totalElectronico)}
                >
                    <span>Total Electrónico</span>
                    <strong>${formatCurrency(summary.totalElectronico)}</strong>
                </div>
                <div 
                    className="caja-summary-card total-efectivo"
                    onClick={() => setPopupData(summaryDetails.totalEfectivo)}
                >
                    <span>Total Efectivo</span>
                    <strong>${formatCurrency(summary.totalEfectivo)}</strong>
                </div>
            </div>

            <div className="caja-summary-secondary">
                <div 
                    className="caja-summary-card"
                    onClick={() => setPopupData(summaryDetails.balanceDiario)}
                >
                    <span>Balance Diario (Ventas)</span>
                    <strong>${formatCurrency(summary.balanceDiario)}</strong>
                </div>
                <div 
                    className="caja-summary-card deuda-cobrada"
                    onClick={() => setPopupData(summaryDetails.deudaCobrada)}
                >
                    <span>Cobranza de Deuda</span>
                    <strong>${formatCurrency(summary.deudaCobrada)}</strong>
                </div>
                <div 
                    className="caja-summary-card deuda-generada"
                    onClick={() => setPopupData(summaryDetails.deudaGenerada)}
                >
                    <span>Deuda Generada</span>
                    <strong>${formatCurrency(summary.deudaGenerada)}</strong>
                </div>
                {summary.totalDescuentos > 0 && (
                    <div 
                        className="caja-summary-card descuentos"
                        onClick={() => setPopupData(summaryDetails.descuentos)}
                    >
                        <span>Descuentos</span>
                        <strong>-${formatCurrency(summary.totalDescuentos)}</strong>
                    </div>
                )}
            </div>

            <div className="caja-transactions-list">
                <h3>Transacciones del Día ({filteredTransactions.length})</h3>
                {isLoading ? <p>Cargando...</p> : (
                    filteredTransactions.length > 0 ? (
                        <div className={viewMode === 'grid' ? 'caja-grid' : 'caja-list'}>
                            {filteredTransactions.map(trans => {
                                const paymentStatus = getPaymentStatus(trans);
                                const hasDebt = (trans.debt || 0) > 0;
                                const isCobro = trans.type === 'Cobro Deuda';
                                const isVenta = trans.type === 'Venta Presencial' || trans.type === 'Pedido Online';
                                
                                return (
                                    <div 
                                        key={trans.id} 
                                        className={`caja-transaction-card ${paymentStatus === 'unpaid' ? 'unpaid' : ''} ${paymentStatus === 'partial' ? 'partial-payment' : ''}`}
                                        onClick={() => setSelectedTransaction(trans)}
                                    >
                                        <div className="card-header">
                                            <span className={`type-badge ${isVenta ? 'venta' : 'cobro'}`}>
                                                {isVenta ? <FaFileInvoiceDollar/> : <FaHandHoldingUsd/>}
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
                                                {isCobro ? `Pagó con ${trans.paymentMethod}` : 
                                                 (trans.payments && trans.payments.length > 0) ? `${trans.payments.length} método(s) de pago` :
                                                 (trans.paymentMethod || 'N/A')}
                                            </p>
                                            {hasDebt && (
                                                <div className="payment-status-indicator">
                                                    <FaExclamationTriangle />
                                                    <span>
                                                        {paymentStatus === 'unpaid' && 'Sin Pagar'}
                                                        {paymentStatus === 'partial' && `Deuda: $${formatCurrency(trans.debt)}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-footer">
                                            <span className="total">${formatCurrency(trans.total || trans.amount)}</span>
                                            <div className="card-actions">
                                                {isVenta && hasDebt && (
                                                    <button 
                                                        title="Cobrar Deuda" 
                                                        className="btn pay-debt" 
                                                        onClick={(e) => handlePayDebt(e, trans)}
                                                    >
                                                        <FaMoneyBillWave/>
                                                    </button>
                                                )}
                                                {isVenta && (
                                                    <>
                                                        <button title="Editar Venta" className="btn edit" onClick={(e) => handleEditSale(e, trans)}><FaPencilAlt/></button>
                                                        <button title="Cancelar Venta" className="btn delete" onClick={(e) => handleDeleteSale(e, trans)}><FaTrash/></button>
                                                    </>
                                                )}
                                                {isCobro && (
                                                    <button title="Anular Cobro" className="btn delete" onClick={(e) => handleDeleteCobro(e, trans)}><FaTrash/></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="no-results-message">No se encontraron transacciones para esta fecha.</p>
                )}
            </div>
        </div>
    );
};

export default CajaDiaria;