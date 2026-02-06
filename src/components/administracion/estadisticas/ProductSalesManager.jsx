import React, { useState } from 'react';
import { getProductSalesHistory } from '../../../services/statsService';
import { Timestamp } from 'firebase/firestore';
import { FaSearch, FaDownload, FaBox } from 'react-icons/fa';
import LoaderSpinner from '../../utils/LoaderSpinner';

const ProductSalesManager = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    };

    const formatDate = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleAnalyze = async () => {
        if (!searchTerm.trim()) {
            alert('Ingresa el nombre del producto');
            return;
        }

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

            const data = await getProductSalesHistory(searchTerm, dateRange);
            setResults(data);
        } catch (error) {
            console.error('Error analyzing product:', error);
            alert('Error al analizar el producto');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (!results || results.sales.length === 0) return;

        const headers = ['Fecha', 'Tutor', 'Paciente', 'Producto', 'Cantidad', 'Precio', 'Total', 'Origen', 'Tipo'];
        const rows = results.sales.map(sale => [
            formatDate(sale.date),
            sale.tutorName,
            sale.patientName,
            sale.productName,
            sale.quantity,
            sale.price.toFixed(2),
            sale.total.toFixed(2),
            sale.source,
            sale.tipo
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `ventas-${searchTerm}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const paginatedSales = results?.sales.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ) || [];

    const totalPages = results ? Math.ceil(results.sales.length / ITEMS_PER_PAGE) : 0;

    return (
        <div className="product-sales-manager">
            <div className="manager-header">
                <h2><FaBox /> Manager de Ventas por Producto</h2>
                <p className="manager-subtitle">Analiza el histórico de ventas de cualquier producto</p>
            </div>

            <div className="search-controls">
                <div className="control-group">
                    <label htmlFor="product-search">Buscar Producto:</label>
                    <input
                        type="text"
                        id="product-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nombre del producto..."
                        className="search-input"
                    />
                </div>

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
                    onClick={handleAnalyze}
                    disabled={isLoading}
                >
                    <FaSearch /> Analizar
                </button>
            </div>

            {isLoading && (
                <div className="loading-container">
                    <LoaderSpinner />
                    <p>Analizando ventas...</p>
                </div>
            )}

            {results && !isLoading && (
                <div className="results-container">
                    <div className="results-header">
                        <h3>Resultados para "{searchTerm}"</h3>
                        <button className="btn-export" onClick={handleExport}>
                            <FaDownload /> Exportar CSV
                        </button>
                    </div>

                    <div className="summary-cards">
                        <div className="summary-card">
                            <span className="card-label">Cantidad Total Vendida</span>
                            <span className="card-value">{results.summary.totalQuantity}</span>
                        </div>
                        <div className="summary-card">
                            <span className="card-label">Ingresos Totales</span>
                            <span className="card-value">{formatCurrency(results.summary.totalRevenue)}</span>
                        </div>
                        <div className="summary-card">
                            <span className="card-label">Ventas Registradas</span>
                            <span className="card-value">{results.summary.salesCount}</span>
                        </div>
                        <div className="summary-card">
                            <span className="card-label">Precio Promedio</span>
                            <span className="card-value">{formatCurrency(results.summary.avgPrice)}</span>
                        </div>
                        <div className="summary-card">
                            <span className="card-label">Precio Mínimo</span>
                            <span className="card-value">{formatCurrency(results.summary.minPrice)}</span>
                        </div>
                        <div className="summary-card">
                            <span className="card-label">Precio Máximo</span>
                            <span className="card-value">{formatCurrency(results.summary.maxPrice)}</span>
                        </div>
                    </div>

                    {results.sales.length > 0 ? (
                        <>
                            <div className="sales-table-container">
                                <table className="sales-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tutor</th>
                                            <th>Paciente</th>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>Precio Unit.</th>
                                            <th>Total</th>
                                            <th>Origen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedSales.map((sale, index) => (
                                            <tr key={`${sale.saleId}-${index}`}>
                                                <td>{formatDate(sale.date)}</td>
                                                <td>{sale.tutorName}</td>
                                                <td>{sale.patientName}</td>
                                                <td>{sale.productName}</td>
                                                <td className="text-center">{sale.quantity}</td>
                                                <td className="text-right">{formatCurrency(sale.price)}</td>
                                                <td className="text-right">{formatCurrency(sale.total)}</td>
                                                <td>
                                                    <span className={`badge-${sale.source}`}>
                                                        {sale.source}
                                                    </span>
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
                    ) : (
                        <div className="empty-results">
                            <p>No se encontraron ventas para este producto en el rango de fechas seleccionado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductSalesManager;