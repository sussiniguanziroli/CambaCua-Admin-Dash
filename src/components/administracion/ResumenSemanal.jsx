import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { FaCalendarWeek } from 'react-icons/fa';

const ResumenSemanal = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weeklyData, setWeeklyData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const getWeekRange = (date) => {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
        const monday = new Date(start.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        
        return { startOfWeek: monday, endOfWeek: sunday };
    };

    const fetchWeekSales = useCallback(async (date) => {
        setIsLoading(true);
        setWeeklyData([]);

        const { startOfWeek, endOfWeek } = getWeekRange(date);
        
        const startTimestamp = Timestamp.fromDate(startOfWeek);
        const endTimestamp = Timestamp.fromDate(endOfWeek);

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

            const sales = [
                ...presencialesSnap.docs.map(doc => doc.data()),
                ...onlineSnap.docs.map(doc => doc.data())
            ];
            
            const dailyTotals = {};
            sales.forEach(sale => {
                const saleDate = sale.createdAt.toDate().toISOString().split('T')[0];
                dailyTotals[saleDate] = (dailyTotals[saleDate] || 0) + sale.total;
            });
            
            const weekArray = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(startOfWeek);
                day.setDate(startOfWeek.getDate() + i);
                const dayString = day.toISOString().split('T')[0];
                weekArray.push({
                    date: day,
                    total: dailyTotals[dayString] || 0
                });
            }
            setWeeklyData(weekArray);

        } catch (error) {
            console.error("Error fetching weekly sales: ", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWeekSales(selectedDate);
    }, [selectedDate, fetchWeekSales]);

    const weekTotal = useMemo(() => {
        return weeklyData.reduce((acc, day) => acc + day.total, 0);
    }, [weeklyData]);

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

    const { startOfWeek, endOfWeek } = getWeekRange(selectedDate);

    return (
        <div className="resumen-semanal-container">
            <div className="page-header">
                <h1>Resumen Semanal</h1>
                <div className="date-picker-group">
                    <label htmlFor="week-date">Seleccionar Semana:</label>
                    <input 
                        type="date" 
                        id="week-date"
                        value={formatDateForInput(selectedDate)}
                        onChange={handleDateChange}
                    />
                </div>
            </div>

            <div className="week-total-summary">
                <div className="icon"><FaCalendarWeek /></div>
                <div className="details">
                    <span className="label">Total de la Semana</span>
                    <span className="dates">{startOfWeek.toLocaleDateString('es-AR')} - {endOfWeek.toLocaleDateString('es-AR')}</span>
                </div>
                <div className="total-value">${weekTotal.toFixed(2)}</div>
            </div>

            {isLoading ? <p className="loading-message">Cargando resumen...</p> : (
                <div className="week-view">
                    {weeklyData.map(({ date, total }) => (
                        <div className="day-card" key={date.toISOString()}>
                            <span className="day-name">{date.toLocaleDateString('es-AR', { weekday: 'long' })}</span>
                            <span className="day-date">{date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
                            <span className="day-total">${total.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResumenSemanal;