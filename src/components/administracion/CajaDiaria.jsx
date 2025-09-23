import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import SaleDetailModal from './SaleDetailModal';
import { FaMoneyBillWave, FaCreditCard, FaStore, FaShoppingCart } from 'react-icons/fa';

// Extra icons for deuda
const FaFileInvoiceDollar = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 384 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M320 0H64C28.7 0 0 28.7 0 64v384c0 35.3 28.7 64 64 64h256c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zM192 416c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm32-160h-64c-8.8 0-16-7.2-16-16s7.2-16 16-16h64c8.8 0 16 7.2 16 16s-7.2 16-16 16zm48-96H112c-8.8 0-16-7.2-16-16s7.2-16 16-16h160c8.8 0 16 7.2 16 16s-7.2 16-16 16z"></path></svg>;
const FaHandHoldingUsd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M528.3 22.8c-20.7-20.7-54.3-20.7-75 0L320 156.2l-32.3-32.3c-27.5-27.5-72.2-27.5-99.7 0l-112 112c-27.5 27.5-27.5 72.2 0 99.7l32.3 32.3L22.8 503.7c-20.7 20.7-20.7 54.3 0 75s54.3 20.7 75 0l133.3-133.3 32.3 32.3c27.5 27.5 72.2 27.5 99.7 0l112-112c27.5-27.5 27.5-72.2 0-99.7l-32.3-32.3L528.3 97.8c20.7-20.7 20.7-54.3 0-75zM224 288c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"></path></svg>;

const CajaDiaria = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    const fetchTransactions = useCallback(async (date) => {
        setIsLoading(true);
        const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
        const startTimestamp = Timestamp.fromDate(startOfDay);
        const endTimestamp = Timestamp.fromDate(endOfDay);

        try {
            const presencialesQuery = query(
                collection(db, 'ventas_presenciales'),
                where('createdAt', '>=', startTimestamp),
                where('createdAt', '<=', endTimestamp)
            );
            const onlineQuery = query(
                collection(db, 'pedidos_completados'),
                where('createdAt', '>=', startTimestamp),
                where('createdAt', '<=', endTimestamp)
            );
            const paymentsQuery = query(
                collection(db, 'pagos_deuda'),
                where('createdAt', '>=', startTimestamp),
                where('createdAt', '<=', endTimestamp)
            );

            const [presencialesSnap, onlineSnap, paymentsSnap] = await Promise.all([
                getDocs(presencialesQuery),
                getDocs(onlineQuery),
                getDocs(paymentsQuery)
            ]);

            const presencialesList = presencialesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Venta Presencial' }));
            const onlineList = onlineSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Pedido Online' }));
            const paymentsList = paymentsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Cobro Deuda' }));

            const combined = [...presencialesList, ...onlineList, ...paymentsList].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setTransactions(combined);
        } catch (error) {
            console.error("Error fetching daily transactions: ", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchTransactions(selectedDate); }, [selectedDate, fetchTransactions]);

    const summary = useMemo(() => {
        return transactions.reduce((acc, trans) => {
            if (trans.type === 'Venta Presencial' || trans.type === 'Pedido Online') {
                acc.totalVendido += trans.total;
                acc.deudaGenerada += trans.debt || 0;
                (trans.payments || []).forEach(p => {
                    acc.metodos[p.method] = (acc.metodos[p.method] || 0) + parseFloat(p.amount);
                });
            } else if (trans.type === 'Cobro Deuda') {
                acc.deudaCobrada += trans.amount;
                acc.metodos[trans.paymentMethod] = (acc.metodos[trans.paymentMethod] || 0) + trans.amount;
            }
            return acc;
        }, { totalVendido: 0, deudaGenerada: 0, deudaCobrada: 0, metodos: {} });
    }, [transactions]);

    const totalEnCaja = useMemo(() => {
        return Object.values(summary.metodos).reduce((sum, val) => sum + val, 0);
    }, [summary.metodos]);

    const formatDateForInput = (date) => {
        const d = new Date(date);
        const offset = d.getTimezoneOffset();
        const adjustedDate = new Date(d.getTime() - (offset*60*1000));
        return adjustedDate.toISOString().split('T')[0];
    };

    return (
        <div className="caja-diaria-container">
            {selectedSale && <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
            <div className="caja-page-header">
                <h1>Caja Diaria</h1>
                <div className="caja-date-picker">
                    <label htmlFor="sale-date">Seleccionar Fecha:</label>
                    <input type="date" id="sale-date" value={formatDateForInput(selectedDate)} onChange={e => setSelectedDate(new Date(e.target.value))} />
                </div>
            </div>

            <div className="caja-summary-grid">
                <div className="caja-summary-card total-caja"><span>Total en Caja</span><strong>${totalEnCaja.toFixed(2)}</strong></div>
                <div className="caja-summary-card"><span>Total Vendido</span><strong>${summary.totalVendido.toFixed(2)}</strong></div>
                <div className="caja-summary-card deuda-cobrada"><span>Cobranza de Deuda</span><strong>${summary.deudaCobrada.toFixed(2)}</strong></div>
                <div className="caja-summary-card deuda-generada"><span>Deuda Generada</span><strong>${summary.deudaGenerada.toFixed(2)}</strong></div>
                {Object.entries(summary.metodos).map(([method, total]) => (
                    <div className="caja-summary-card" key={method}><span>{method}</span><strong>${total.toFixed(2)}</strong></div>
                ))}
            </div>

            <div className="caja-transactions-list">
                <h3>Transacciones del Día ({transactions.length})</h3>
                {isLoading ? <p>Cargando...</p> : (
                    transactions.length > 0 ? (
                        <div className="caja-grid">
                            {transactions.map(trans => (
                                <div key={trans.id} className="caja-transaction-card" onClick={() => (trans.type !== 'Cobro Deuda') && setSelectedSale(trans)}>
                                    <div className="card-header">
                                        <span className={`type-badge ${trans.type.includes('Venta') || trans.type.includes('Pedido') ? 'venta' : 'cobro'}`}>
                                            {trans.type === 'Pedido Online' ? <FaShoppingCart /> : trans.type === 'Venta Presencial' ? <FaStore /> : trans.type === 'Cobro Deuda' ? <FaHandHoldingUsd /> : <FaFileInvoiceDollar />} {trans.type}
                                        </span>
                                        <span className="time">{trans.createdAt.toDate().toLocaleTimeString('es-AR')}</span>
                                    </div>
                                    <div className="card-body">
                                        <p className="customer">{trans.tutorInfo?.name || trans.tutorName || 'N/A'}</p>
                                        <p className="details">
                                            {trans.type === 'Cobro Deuda' ? `Pagó con ${trans.paymentMethod}` : trans.paymentMethod ? (
                                                <>{trans.paymentMethod === 'Efectivo' ? <FaMoneyBillWave /> : <FaCreditCard />} {trans.paymentMethod}</>
                                            ) : `${(trans.payments || []).length} método(s) de pago`}
                                        </p>
                                    </div>
                                    <div className="card-footer">
                                        <span className="total">${(trans.total || trans.amount).toFixed(2)}</span>
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
