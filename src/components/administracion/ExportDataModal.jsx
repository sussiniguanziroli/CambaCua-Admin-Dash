import React, { useState } from 'react';
import { FaTimes, FaDownload, FaFileCsv, FaFileExcel } from 'react-icons/fa';
import { exportToCSV } from '../../services/statsService';

const ExportDataModal = ({ data, speciesLabel, period, onClose }) => {
    const [exportType, setExportType] = useState('spent');
    const [format, setFormat] = useState('csv');
    const [isExporting, setIsExporting] = useState(false);

    const exportOptions = [
        { id: 'spent', label: 'Ranking por Gasto', data: data?.bySpent || [] },
        { id: 'frequency', label: 'Ranking por Frecuencia', data: data?.byFrequency || [] },
        { id: 'engagement', label: 'Ranking por Engagement', data: data?.byEngagement || [] },
        { id: 'all', label: 'Todos los Datos', data: data?.all || [] }
    ];

    const handleExport = () => {
        setIsExporting(true);
        
        const selectedData = exportOptions.find(opt => opt.id === exportType)?.data || [];
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `top-customers-${speciesLabel}-${exportType}-${period}-${timestamp}`;

        try {
            if (format === 'csv') {
                exportToCSV(selectedData, filename);
            } else {
                exportToExcel(selectedData, filename);
            }
            
            setTimeout(() => {
                setIsExporting(false);
                onClose();
            }, 1000);
        } catch (error) {
            console.error('Error exporting data:', error);
            setIsExporting(false);
        }
    };

    const exportToExcel = (data, filename) => {
        const headers = ['Posición', 'Tutor ID', 'Tutor', 'Gasto Total', 'Compras', 'Ticket Promedio', 'Engagement', 'Citas', 'Historias', 'Recetas', 'Vencimientos', 'Última Compra', 'Especies', 'Saldo Cuenta'];
        
        const rows = data.map((item, index) => [
            index + 1,
            item.tutorId,
            item.tutorName,
            item.totalSpent.toFixed(2),
            item.purchaseCount,
            item.avgTicket.toFixed(2),
            item.engagementScore,
            item.breakdown.citas,
            item.breakdown.historias,
            item.breakdown.recetas,
            item.breakdown.vencimientos,
            item.lastPurchase ? item.lastPurchase.toDate().toLocaleDateString('es-AR') : 'N/A',
            item.species.join(', '),
            item.accountBalance.toFixed(2)
        ]);

        let csvContent = '\uFEFF';
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="export-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📊 Exportar Datos</h2>
                    <button className="modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="export-info">
                        <p><strong>Especie:</strong> {speciesLabel}</p>
                        <p><strong>Período:</strong> {period === '3months' ? 'Últimos 3 meses' : period === '6months' ? 'Últimos 6 meses' : period === '1year' ? 'Último año' : 'Todo el historial'}</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="exportType">Seleccionar datos a exportar:</label>
                        <select 
                            id="exportType" 
                            value={exportType} 
                            onChange={(e) => setExportType(e.target.value)}
                            className="export-select"
                        >
                            {exportOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.label} ({opt.data.length} registros)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Formato de exportación:</label>
                        <div className="format-options">
                            <button
                                className={`format-btn ${format === 'csv' ? 'active' : ''}`}
                                onClick={() => setFormat('csv')}
                            >
                                <FaFileCsv />
                                <span>CSV</span>
                            </button>
                            <button
                                className={`format-btn ${format === 'excel' ? 'active' : ''}`}
                                onClick={() => setFormat('excel')}
                            >
                                <FaFileExcel />
                                <span>Excel (CSV)</span>
                            </button>
                        </div>
                    </div>

                    <div className="export-preview">
                        <h4>Vista previa de campos:</h4>
                        <ul className="fields-list">
                            <li>✓ Posición en ranking</li>
                            <li>✓ Nombre del tutor</li>
                            <li>✓ Gasto total</li>
                            <li>✓ Número de compras</li>
                            <li>✓ Ticket promedio</li>
                            <li>✓ Score de engagement</li>
                            <li>✓ Desglose de engagement (citas, historias, recetas, vencimientos)</li>
                            <li>✓ Última compra</li>
                            <li>✓ Especies de pacientes</li>
                            <li>✓ Saldo de cuenta corriente</li>
                        </ul>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        <FaDownload />
                        {isExporting ? 'Exportando...' : 'Exportar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportDataModal;