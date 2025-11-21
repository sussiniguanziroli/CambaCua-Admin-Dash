import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { FaCalendarWeek, FaDownload, FaSyncAlt } from 'react-icons/fa';
import { calculateTopCustomers, clearStatsCache } from '../../services/statsService';
import TopCustomersTab from './TopCustomersTab';
import CustomerDetailModal from './CustomerDetailModal';
import ExportDataModal from './ExportDataModal';
import LoaderSpinner from '../utils/LoaderSpinner';

const ResumenSemanal = () => {
    const [activeMainTab, setActiveMainTab] = useState('resumen');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weeklyData, setWeeklyData] = useState([]);
    const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);

    const [period, setPeriod] = useState('6months');
    const [topLimit, setTopLimit] = useState(10);
    
    const [perrosData, setPerrosData] = useState(null);
    const [gatosData, setGatosData] = useState(null);
    const [allData, setAllData] = useState(null);
    
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState({ step: '', progress: 0, message: '' });
    
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSpecies, setExportSpecies] = useState('Canino');

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
        setIsLoadingWeekly(true);
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
            setIsLoadingWeekly(false);
        }
    }, []);

    const fetchTopCustomers = useCallback(async (forceRefresh = false) => {
        if (forceRefresh) {
            clearStatsCache();
        }

        setIsLoadingStats(true);
        setLoadingProgress({ step: 'start', progress: 0, message: 'Iniciando análisis...' });

        try {
            const [perros, gatos, all] = await Promise.all([
                calculateTopCustomers('Canino', period, topLimit, setLoadingProgress),
                calculateTopCustomers('Felino', period, topLimit, setLoadingProgress),
                calculateTopCustomers('all', period, topLimit, setLoadingProgress)
            ]);

            setPerrosData(perros);
            setGatosData(gatos);
            setAllData(all);
        } catch (error) {
            console.error('Error fetching top customers:', error);
        } finally {
            setIsLoadingStats(false);
            setLoadingProgress({ step: 'complete', progress: 100, message: 'Completado' });
        }
    }, [period, topLimit]);

    useEffect(() => {
        fetchWeekSales(selectedDate);
    }, [selectedDate, fetchWeekSales]);

    useEffect(() => {
        if (activeMainTab !== 'resumen' && !perrosData && !gatosData && !allData) {
            fetchTopCustomers();
        }
    }, [activeMainTab, perrosData, gatosData, allData, fetchTopCustomers]);

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

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        setPerrosData(null);
        setGatosData(null);
        setAllData(null);
    };

    const handleRecalculate = () => {
        fetchTopCustomers(true);
    };

    const handleExport = (species) => {
        setExportSpecies(species);
        setShowExportModal(true);
    };

    const getExportData = () => {
        switch(exportSpecies) {
            case 'Canino':
                return perrosData;
            case 'Felino':
                return gatosData;
            case 'all':
                return allData;
            default:
                return null;
        }
    };

    const { startOfWeek, endOfWeek } = getWeekRange(selectedDate);

    const renderResumenTab = () => (
        <div className="resumen-tab-content">
            <div className="date-picker-group">
                <label htmlFor="week-date">Seleccionar Semana:</label>
                <input 
                    type="date" 
                    id="week-date"
                    value={formatDateForInput(selectedDate)}
                    onChange={handleDateChange}
                />
            </div>

            <div className="week-total-summary">
                <div className="icon"><FaCalendarWeek /></div>
                <div className="details">
                    <span className="label">Total de la Semana</span>
                    <span className="dates">{startOfWeek.toLocaleDateString('es-AR')} - {endOfWeek.toLocaleDateString('es-AR')}</span>
                </div>
                <div className="total-value">${weekTotal.toFixed(2)}</div>
            </div>

            {isLoadingWeekly ? (
                <div className="loading-container">
                    <LoaderSpinner />
                    <p>Cargando resumen...</p>
                </div>
            ) : (
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

    const renderStatsControls = () => (
        <div className="stats-controls">
            <div className="controls-group">
                <div className="control-item">
                    <label htmlFor="period-select">Período:</label>
                    <select 
                        id="period-select"
                        value={period} 
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="period-select"
                    >
                        <option value="3months">Últimos 3 meses</option>
                        <option value="6months">Últimos 6 meses</option>
                        <option value="1year">Último año</option>
                        <option value="all">Todo el historial</option>
                    </select>
                </div>

                <div className="control-item">
                    <label htmlFor="limit-select">Mostrar:</label>
                    <select 
                        id="limit-select"
                        value={topLimit} 
                        onChange={(e) => setTopLimit(Number(e.target.value))}
                        className="limit-select"
                    >
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                    </select>
                </div>
            </div>

            <div className="controls-actions">
                <button 
                    className="btn-control btn-recalculate" 
                    onClick={handleRecalculate}
                    disabled={isLoadingStats}
                >
                    <FaSyncAlt className={isLoadingStats ? 'spinning' : ''} />
                    Recalcular
                </button>
                <button 
                    className="btn-control btn-export" 
                    onClick={() => {
                        const speciesMap = {
                            'perros': 'Canino',
                            'gatos': 'Felino',
                            'comparativa': 'all'
                        };
                        handleExport(speciesMap[activeMainTab] || 'Canino');
                    }}
                    disabled={isLoadingStats}
                >
                    <FaDownload />
                    Exportar
                </button>
            </div>
        </div>
    );

    const renderLoadingProgress = () => (
        <div className="stats-loading-container">
            <LoaderSpinner />
            <div className="loading-progress">
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${loadingProgress.progress}%` }}
                    ></div>
                </div>
                <p className="progress-message">{loadingProgress.message}</p>
                <p className="progress-percentage">{loadingProgress.progress}%</p>
            </div>
        </div>
    );

    return (
        <div className="resumen-semanal-container">
            <div className="page-header">
                <h1>📊 Estadísticas y Análisis de Clientes</h1>
            </div>

            <div className="main-tabs">
                <button 
                    className={`main-tab ${activeMainTab === 'resumen' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('resumen')}
                >
                    📅 Resumen Semanal
                </button>
                <button 
                    className={`main-tab ${activeMainTab === 'perros' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('perros')}
                >
                    🐕 Top Perros
                </button>
                <button 
                    className={`main-tab ${activeMainTab === 'gatos' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('gatos')}
                >
                    🐈 Top Gatos
                </button>
                <button 
                    className={`main-tab ${activeMainTab === 'comparativa' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('comparativa')}
                >
                    📊 Comparativa Global
                </button>
            </div>

            <div className="main-content">
                {activeMainTab === 'resumen' && renderResumenTab()}
                
                {activeMainTab === 'perros' && (
                    <>
                        {renderStatsControls()}
                        {isLoadingStats ? renderLoadingProgress() : (
                            <TopCustomersTab 
                                data={perrosData}
                                speciesLabel="Perros"
                                onViewDetail={setSelectedCustomer}
                                isLoading={isLoadingStats}
                            />
                        )}
                    </>
                )}

                {activeMainTab === 'gatos' && (
                    <>
                        {renderStatsControls()}
                        {isLoadingStats ? renderLoadingProgress() : (
                            <TopCustomersTab 
                                data={gatosData}
                                speciesLabel="Gatos"
                                onViewDetail={setSelectedCustomer}
                                isLoading={isLoadingStats}
                            />
                        )}
                    </>
                )}

                {activeMainTab === 'comparativa' && (
                    <>
                        {renderStatsControls()}
                        {isLoadingStats ? renderLoadingProgress() : (
                            <TopCustomersTab 
                                data={allData}
                                speciesLabel="Todas las Especies"
                                onViewDetail={setSelectedCustomer}
                                isLoading={isLoadingStats}
                            />
                        )}
                    </>
                )}
            </div>

            {selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    period={period}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}

            {showExportModal && (
                <ExportDataModal
                    data={getExportData()}
                    speciesLabel={exportSpecies === 'all' ? 'Todas las Especies' : exportSpecies === 'Canino' ? 'Perros' : 'Gatos'}
                    period={period}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </div>
    );
};

export default ResumenSemanal;