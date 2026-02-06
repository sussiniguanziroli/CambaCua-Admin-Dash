import React, { useState } from 'react';
import { getDebtAccountsReport } from '../../../services/statsService';
import { Timestamp } from 'firebase/firestore';
import { FaSearch, FaDownload, FaMoneyBillWave, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import LoaderSpinner from '../../utils/LoaderSpinner';

const DebtAccountsManager = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [activeView, setActiveView] = useState('deudores');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;
    const navigate = useNavigate();

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    };

    const formatDate = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatDateTime = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            alert('Selecciona un rango de fechas');
            return;
        }

        setIsLoading(true);
        setResults(null);
        setCurrentPage(1);

        try {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            const dateRange = {
                start: Timestamp.fromDate(startDateTime),
                end: Timestamp.fromDate(endDateTime)
            };

            const data = await getDebtAccountsReport(dateRange);
            setResults(data);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error al generar el reporte');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportDeudores = () => {
        if (!results || results.deudores.length === 0) return;

        const headers = ['Tutor', 'Teléfono', 'Email', 'Deuda Actual', 'Última Venta', 'Último Cobro', 'Ventas en Período', 'Cobros en Período'];
        const rows = results.deudores.map(d => [
            d.tutorName,
            d.phone,
            d.email,
            d.deudaActual.toFixed(2),
            formatDate(d.lastSaleDate),
            formatDate(d.lastCobroDate),
            d.salesInPeriod,
            d.cobrosInPeriod
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `deudores-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportMovimientos = () => {
        if (!results || results.movimientos.length === 0) return;

        const headers = ['Fecha', 'Tipo', 'Tutor', 'Paciente', 'Monto', 'Método Pago'];
        const rows = results.movimientos.map(m => [
            formatDateTime(m.date),
            m.type === 'deuda_generada' ? 'Deuda Generada' : 'Cobro',
            m.tutorName,
            m.patientName,
            m.amount.toFixed(2),
            m.paymentMethod || 'N/A'
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `movimientos-deuda-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderDeudores = () => {
        if (!results || results.deudores.length === 0) {
            return (
                <div className="empty-results">
                    <p>No hay deudores en este momento.</p>
                </div>
            );
        }

        const paginatedDeudores = results.deudores.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        const totalPages = Math.ceil(results.deudores.length / ITEMS_PER_PAGE);

        return (
            <>
                <div className="table-actions">
                    <button className="btn-export" onClick={handleExportDeudores}>
                        <FaDownload /> Exportar Deudores
                    </button>
                </div>

                <div className="deudores-table-container">
                    <table className="deudores-table">
                        <thead>
                            <tr>
                                <th>Tutor</th>
                                <th>Contacto</th>
                                <th>Deuda Actual</th>
                                <th>Última Venta</th>
                                <th>Último Cobro</th>
                                <th>Actividad (Período)</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedDeudores.map(deudor => (
                                <tr key={deudor.tutorId}>
                                    <td className="tutor-name">{deudor.tutorName}</td>
                                    <td>
                                        <div className="contact-info">
                                            <span>{deudor.phone}</span>
                                            <span className="email">{deudor.email}</span>
                                        </div>
                                    </td>
                                    <td className="debt-amount">
                                        <span className="amount-negative">
                                            {formatCurrency(deudor.deudaActual)}
                                        </span>
                                    </td>
                                    <td>{formatDate(deudor.lastSaleDate)}</td>
                                    <td>{formatDate(deudor.lastCobroDate)}</td>
                                    <td className="activity-cell">
                                        <span className="activity-badge">
                                            {deudor.salesInPeriod} ventas
                                        </span>
                                        <span className="activity-badge cobros">
                                            {deudor.cobrosInPeriod} cobros
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-view-profile"
                                            onClick={() => navigate(`/admin/tutor-profile/${deudor.tutorId}`)}
                                        >
                                            Ver Perfil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </>
        );
    };

    const renderMovimientos = () => {
        if (!results || results.movimientos.length === 0) {
            return (
                <div className="empty-results">
                    <p>No hay movimientos en el período seleccionado.</p>
                </div>
            );
        }

        const paginatedMovimientos = results.movimientos.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );

        const totalPages = Math.ceil(results.movimientos.length / ITEMS_PER_PAGE);

        return (
            <>
                <div className="table-actions">
                    <button className="btn-export" onClick={handleExportMovimientos}>
                        <FaDownload /> Exportar Movimientos
                    </button>
                </div>

                <div className="movimientos-timeline">
                    {paginatedMovimientos.map((mov, index) => (
                        <div
                            key={`${mov.saleId}-${index}`}
                            className={`movimiento-item ${mov.type}`}
                        >
                            <div className="movimiento-icon">
                                {mov.type === 'deuda_generada' ? (
                                    <FaExclamationTriangle />
                                ) : (
                                    <FaMoneyBillWave />
                                )}
                            </div>
                            <div className="movimiento-content">
                                <div className="movimiento-header">
                                    <span className="movimiento-type">
                                        {mov.type === 'deuda_generada' ? 'Deuda Generada' : 'Cobro Realizado'}
                                    </span>
                                    <span className="movimiento-date">{formatDateTime(mov.date)}</span>
                                </div>
                                <div className="movimiento-details">
                                    <span className="detail-item">
                                        <strong>Tutor:</strong> {mov.tutorName}
                                    </span>
                                    <span className="detail-item">
                                        <strong>Paciente:</strong> {mov.patientName}
                                    </span>
                                    {mov.paymentMethod && (
                                        <span className="detail-item">
                                            <strong>Método:</strong> {mov.paymentMethod}
                                        </span>
                                    )}
                                </div>
                                <div className="movimiento-amount">
                                    <span className={mov.type === 'deuda_generada' ? 'amount-negative' : 'amount-positive'}>
                                        {formatCurrency(mov.amount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="debt-accounts-manager">
            <div className="manager-header">
                <h2><FaMoneyBillWave /> Manager de Cuentas Corrientes</h2>
                <p className="manager-subtitle">Reportes de deuda generada, cobrada y deudores actuales</p>
            </div>

            <div className="search-controls">
                <div className="control-group">
                    <label htmlFor="start-date">Desde:</label>
                    <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="date-input"
                    />
                </div>

                <div className="control-group">
                    <label htmlFor="end-date">Hasta:</label>
                    <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="date-input"
                    />
                </div>

                <button
                    className="btn-analyze"
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                >
                    <FaSearch /> Generar Reporte
                </button>
            </div>

            {isLoading && (
                <div className="loading-container">
                    <LoaderSpinner />
                    <p>Generando reporte...</p>
                </div>
            )}

            {results && !isLoading && (
                <div className="results-container">
                    <div className="summary-cards">
                        <div className="summary-card deuda-generada">
                            <span className="card-label">Deuda Generada (Período)</span>
                            <span className="card-value">{formatCurrency(results.summary.deudaGenerada)}</span>
                            <span className="card-detail">{results.summary.salesWithDebt} ventas con deuda</span>
                        </div>
                        <div className="summary-card deuda-cobrada">
                            <span className="card-label">Deuda Cobrada (Período)</span>
                            <span className="card-value">{formatCurrency(results.summary.deudaCobrada)}</span>
                            <span className="card-detail">{results.summary.cobrosCount} cobros realizados</span>
                        </div>
                        <div className="summary-card deuda-pendiente">
                            <span className="card-label">Deuda Pendiente (Actual)</span>
                            <span className="card-value amount-negative">
                                {formatCurrency(results.summary.deudaPendiente)}
                            </span>
                            <span className="card-detail">{results.summary.deudoresCount} deudores activos</span>
                        </div>
                    </div>

                    <div className="view-tabs">
                        <button
                            className={`view-tab ${activeView === 'deudores' ? 'active' : ''}`}
                            onClick={() => { setActiveView('deudores'); setCurrentPage(1); }}
                        >
                            Deudores Actuales ({results.deudores.length})
                        </button>
                        <button
                            className={`view-tab ${activeView === 'movimientos' ? 'active' : ''}`}
                            onClick={() => { setActiveView('movimientos'); setCurrentPage(1); }}
                        >
                            Movimientos del Período ({results.movimientos.length})
                        </button>
                    </div>

                    <div className="view-content">
                        {activeView === 'deudores' ? renderDeudores() : renderMovimientos()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtAccountsManager;