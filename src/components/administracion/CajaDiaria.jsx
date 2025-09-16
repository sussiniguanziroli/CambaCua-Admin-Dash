import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { FaMoneyBillWave, FaCreditCard, FaStore, FaShoppingCart } from 'react-icons/fa';
import SaleDetailModal from './SaleDetailModal';

const CajaDiaria = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [salesData, setSalesData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);

    const fetchSales = useCallback(async (date) => {
        setIsLoading(true);
        setSalesData([]);
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

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

            const [presencialesSnap, onlineSnap] = await Promise.all([
                getDocs(presencialesQuery),
                getDocs(onlineQuery)
            ]);

            const presencialesList = presencialesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Venta Presencial' }));
            const onlineList = onlineSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Pedido Online' }));

            const combinedSales = [...presencialesList, ...onlineList];
            combinedSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            
            setSalesData(combinedSales);

        } catch (error) {
            console.error("Error fetching daily sales: ", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSales(selectedDate);
    }, [selectedDate, fetchSales]);

    const summaryTotals = useMemo(() => {
        return salesData.reduce((acc, sale) => {
            acc.grandTotal = (acc.grandTotal || 0) + sale.total;
            acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
            return acc;
        }, {});
    }, [salesData]);

    const handleDateChange = (e) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    };

    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <div className="caja-diaria-container">
            <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
            <div className="page-header">
                <h1>Caja Diaria</h1>
                <div className="date-picker-group">
                    <label htmlFor="sale-date">Seleccionar Fecha:</label>
                    <input 
                        type="date" 
                        id="sale-date"
                        value={formatDateForInput(selectedDate)}
                        onChange={handleDateChange}
                    />
                </div>
            </div>
            
            <div className="summary-section">
                <div className="summary-card total">
                    <span className="label">Total Vendido</span>
                    <span className="value">${(summaryTotals.grandTotal || 0).toFixed(2)}</span>
                </div>
                {Object.entries(summaryTotals).filter(([key]) => key !== 'grandTotal').map(([method, total]) => (
                    <div className="summary-card" key={method}>
                        <span className="label">{method}</span>
                        <span className="value">${total.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            <div className="sales-list-container">
                <h3>Ventas del Día ({salesData.length})</h3>
                {isLoading ? <p className="loading-message">Cargando ventas...</p> : (
                    salesData.length > 0 ? (
                        <div className="sales-list">
                            {salesData.map(sale => (
                                <div key={sale.id} className="sale-card" onClick={() => setSelectedSale(sale)}>
                                    <div className="sale-card-header">
                                        <span className={`type-badge ${sale.type === 'Pedido Online' ? 'online' : 'presencial'}`}>
                                            {sale.type === 'Pedido Online' ? <FaShoppingCart /> : <FaStore />}
                                            {sale.type}
                                        </span>
                                        <span className="time">{sale.createdAt.toDate().toLocaleTimeString('es-AR')}</span>
                                    </div>
                                    <div className="sale-card-body">
                                        <p className="customer">{sale.tutorInfo?.name || 'Cliente no especificado'}</p>
                                        <p className="payment-method">
                                            {sale.paymentMethod === 'Efectivo' ? <FaMoneyBillWave /> : <FaCreditCard />}
                                            {sale.paymentMethod}
                                        </p>
                                    </div>
                                    <div className="sale-card-footer">
                                        <span className="total">${sale.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="no-results-message">No se encontraron ventas para esta fecha.</p>
                )}
            </div>
        </div>
    );
};

export default CajaDiaria;