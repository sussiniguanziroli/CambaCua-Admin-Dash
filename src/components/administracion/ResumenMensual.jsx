import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaExternalLinkAlt } from 'react-icons/fa';
import LoaderSpinner from '../utils/LoaderSpinner';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const computeDaySummary = (transactions) =>
    transactions.reduce((acc, trans) => {
        if (trans.type === 'Venta Presencial' || trans.type === 'Pedido Online') {
            acc.balanceDiario += trans.subtotal || trans.total || 0;
            acc.totalDescuentos += trans.discount || 0;
            acc.deudaGenerada += trans.debt || 0;
            (trans.payments || []).forEach(p => {
                const amt = parseFloat(p.amount) || 0;
                if (p.method === 'Efectivo') acc.totalEfectivo += amt;
                else acc.totalElectronico += amt;
            });
        } else if (trans.type === 'Cobro Deuda') {
            const amt = parseFloat(trans.amount) || 0;
            acc.deudaCobrada += amt;
            if (trans.paymentMethod === 'Efectivo') acc.totalEfectivo += amt;
            else acc.totalElectronico += amt;
        }
        acc.count++;
        return acc;
    }, { balanceDiario: 0, totalDescuentos: 0, deudaGenerada: 0, deudaCobrada: 0, totalEfectivo: 0, totalElectronico: 0, count: 0 });

const ResumenMensual = () => {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const fmt = (n) =>
        (parseFloat(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fetchMonth = useCallback(async (y, m) => {
        setIsLoading(true);
        setTransactions([]);
        const start = Timestamp.fromDate(new Date(y, m, 1, 0, 0, 0, 0));
        const end   = Timestamp.fromDate(new Date(y, m + 1, 0, 23, 59, 59, 999));
        try {
            const [presSnap, onlineSnap, cobrosSnap] = await Promise.all([
                getDocs(query(collection(db, 'ventas_presenciales'), where('createdAt', '>=', start), where('createdAt', '<=', end))),
                getDocs(query(collection(db, 'pedidos_completados'),  where('createdAt', '>=', start), where('createdAt', '<=', end))),
                getDocs(query(collection(db, 'cobros_deuda'),          where('createdAt', '>=', start), where('createdAt', '<=', end))),
            ]);
            setTransactions([
                ...presSnap.docs.map(d  => ({ ...d.data(),  id: d.id,  type: 'Venta Presencial' })),
                ...onlineSnap.docs.map(d => ({ ...d.data(),  id: d.id,  type: 'Pedido Online' })),
                ...cobrosSnap.docs.map(d => ({ ...d.data(),  id: d.id,  type: 'Cobro Deuda' })),
            ]);
        } catch (e) {
            console.error('Error fetching monthly data:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

    const byDay = useMemo(() => {
        const map = {};
        transactions.forEach(t => {
            const d = t.createdAt.toDate().getDate();
            if (!map[d]) map[d] = [];
            map[d].push(t);
        });
        return map;
    }, [transactions]);

    const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

    const firstDayOffset = useMemo(() => {
        const dow = new Date(year, month, 1).getDay();
        return dow === 0 ? 6 : dow - 1;
    }, [year, month]);

    const monthlySummary = useMemo(() => computeDaySummary(transactions), [transactions]);
    const monthTotal = monthlySummary.totalEfectivo + monthlySummary.totalElectronico;

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (year === today.getFullYear() && month === today.getMonth()) return;
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const goToDay = (day) => {
        const d = new Date(year, month, day);
        const adjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        navigate('/admin/caja-diaria', { state: { date: adjusted.toISOString().split('T')[0] } });
    };

    const isAtCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    const cells = [
        ...Array(firstDayOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const STAT_CARDS = [
        { label: 'Total en Caja',    value: `$${fmt(monthTotal)}`,                         cls: 'total' },
        { label: 'Efectivo',         value: `$${fmt(monthlySummary.totalEfectivo)}`,        cls: 'efectivo' },
        { label: 'Electrónico',      value: `$${fmt(monthlySummary.totalElectronico)}`,     cls: 'electronico' },
        { label: 'Ventas',           value: `$${fmt(monthlySummary.balanceDiario)}`,        cls: 'ventas' },
        { label: 'Deuda Generada',   value: `$${fmt(monthlySummary.deudaGenerada)}`,        cls: 'deuda-gen' },
        { label: 'Deuda Cobrada',    value: `$${fmt(monthlySummary.deudaCobrada)}`,         cls: 'deuda-cob' },
        { label: 'Descuentos',       value: `-$${fmt(monthlySummary.totalDescuentos)}`,     cls: 'descuentos' },
    ];

    return (
        <div className="resumen-mensual-container">

            <div className="rm-month-nav">
                <button className="rm-nav-btn" onClick={prevMonth}>‹</button>
                <div className="rm-month-label">
                    <FaCalendarAlt />
                    <span>{MONTH_NAMES[month]} {year}</span>
                </div>
                <button className="rm-nav-btn" onClick={nextMonth} disabled={isAtCurrentMonth}>›</button>
            </div>

            <div className="rm-summary-banner">
                {STAT_CARDS.map(({ label, value, cls }) => (
                    <div key={cls} className={`rm-stat-card rm-stat-${cls}`}>
                        <span className="rm-stat-label">{label}</span>
                        <span className="rm-stat-value">{value}</span>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="rm-loading">
                    <LoaderSpinner />
                    <p>Cargando datos del mes...</p>
                </div>
            ) : (
                <div className="rm-calendar-wrapper">
                    <div className="rm-calendar">

                        <div className="rm-week-header">
                            {DAY_NAMES.map(n => (
                                <div key={n} className="rm-wh-cell">{n}</div>
                            ))}
                        </div>

                        <div className="rm-grid">
                            {cells.map((day, idx) => {
                                if (!day) return <div key={`e-${idx}`} className="rm-cell rm-cell-empty" />;

                                const dayTx  = byDay[day] || [];
                                const hasTx  = dayTx.length > 0;
                                const s      = hasTx ? computeDaySummary(dayTx) : null;
                                const total  = s ? s.totalEfectivo + s.totalElectronico : 0;
                                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                                return (
                                    <div
                                        key={day}
                                        className={`rm-cell${hasTx ? ' has-data' : ' no-data'}${isToday ? ' is-today' : ''}`}
                                        onClick={() => hasTx && goToDay(day)}
                                        title={hasTx ? 'Ver en Caja Diaria' : undefined}
                                    >
                                        <div className="rm-cell-top">
                                            <span className="rm-day-num">{day}</span>
                                            {hasTx && <FaExternalLinkAlt className="rm-link-icon" />}
                                        </div>

                                        {hasTx ? (
                                            <>
                                                <div className="rm-cell-total">${fmt(total)}</div>
                                                <div className="rm-cell-rows">
                                                    <div className="rm-cell-row">
                                                        <span className="rm-chip efec">Efec</span>
                                                        <span className="rm-chip-val">${fmt(s.totalEfectivo)}</span>
                                                    </div>
                                                    <div className="rm-cell-row">
                                                        <span className="rm-chip elec">Elec</span>
                                                        <span className="rm-chip-val">${fmt(s.totalElectronico)}</span>
                                                    </div>
                                                    <div className="rm-cell-row">
                                                        <span className="rm-chip vtas">Ventas</span>
                                                        <span className="rm-chip-val">${fmt(s.balanceDiario)}</span>
                                                    </div>
                                                    {s.deudaGenerada > 0 && (
                                                        <div className="rm-cell-row">
                                                            <span className="rm-chip dgen">Dda Gen</span>
                                                            <span className="rm-chip-val warn">${fmt(s.deudaGenerada)}</span>
                                                        </div>
                                                    )}
                                                    {s.deudaCobrada > 0 && (
                                                        <div className="rm-cell-row">
                                                            <span className="rm-chip dcob">Dda Cob</span>
                                                            <span className="rm-chip-val good">${fmt(s.deudaCobrada)}</span>
                                                        </div>
                                                    )}
                                                    {s.totalDescuentos > 0 && (
                                                        <div className="rm-cell-row">
                                                            <span className="rm-chip desc">Desc</span>
                                                            <span className="rm-chip-val muted">-${fmt(s.totalDescuentos)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="rm-cell-footer">{s.count} mov.</div>
                                            </>
                                        ) : (
                                            <div className="rm-no-data-label">sin movimientos</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumenMensual;
