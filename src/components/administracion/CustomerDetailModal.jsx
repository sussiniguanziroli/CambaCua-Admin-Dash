import React, { useState, useEffect } from 'react';
import { getTutorDetailedStats } from '../../services/statsService';
import { FaTimes, FaUser, FaShoppingBag, FaStethoscope, FaChartLine, FaDog, FaCat } from 'react-icons/fa';
import LoaderSpinner from '../utils/LoaderSpinner';

const CustomerDetailModal = ({ customer, period, onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [detailedData, setDetailedData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const data = await getTutorDetailedStats(customer.tutorId, period);
                setDetailedData(data);
            } catch (error) {
                console.error('Error fetching detailed stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (customer) {
            fetchDetails();
        }
    }, [customer, period]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    };

    const formatDate = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('es-AR');
    };

    const renderProfileTab = () => (
        <div className="modal-tab-content">
            <div className="profile-summary">
                <div className="profile-avatar">
                    <FaUser />
                </div>
                <div className="profile-info">
                    <h3>{customer.tutorName}</h3>
                    <p className="profile-balance">
                        Saldo: <span className={customer.accountBalance < 0 ? 'negative' : 'positive'}>
                            {formatCurrency(customer.accountBalance)}
                        </span>
                    </p>
                </div>
            </div>

            <div className="profile-patients">
                <h4>Pacientes ({customer.patients.length})</h4>
                <div className="patients-grid">
                    {customer.patients.map(patient => (
                        <div key={patient.id} className="patient-chip">
                            {patient.species === 'Canino' ? <FaDog /> : <FaCat />}
                            <span>{patient.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="profile-stats-grid">
                <div className="stat-card">
                    <span className="stat-label">Gasto Total</span>
                    <span className="stat-value">{formatCurrency(customer.totalSpent)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Compras</span>
                    <span className="stat-value">{customer.purchaseCount}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Ticket Promedio</span>
                    <span className="stat-value">{formatCurrency(customer.avgTicket)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Engagement</span>
                    <span className="stat-value">{customer.engagementScore}</span>
                </div>
            </div>
        </div>
    );

    const renderComprasTab = () => {
        if (!detailedData) return <LoaderSpinner />;

        return (
            <div className="modal-tab-content">
                <div className="compras-summary">
                    <h4>Resumen Financiero</h4>
                    <div className="summary-cards">
                        <div className="summary-card">
                            <span className="label">Gasto Total</span>
                            <span className="value">{formatCurrency(detailedData.summary.totalSpent)}</span>
                        </div>
                        <div className="summary-card">
                            <span className="label">N° Compras</span>
                            <span className="value">{detailedData.summary.purchaseCount}</span>
                        </div>
                        <div className="summary-card">
                            <span className="label">Ticket Promedio</span>
                            <span className="value">
                                {formatCurrency(detailedData.summary.purchaseCount > 0 
                                    ? detailedData.summary.totalSpent / detailedData.summary.purchaseCount 
                                    : 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="compras-list">
                    <h4>Últimas Compras</h4>
                    {detailedData.sales.length > 0 ? (
                        <div className="sales-timeline">
                            {detailedData.sales.slice(0, 10).map(sale => (
                                <div key={sale.id} className="sale-item">
                                    <div className="sale-date">{formatDate(sale.createdAt)}</div>
                                    <div className="sale-details">
                                        <span className="sale-products">
                                            {sale.items?.length || 0} productos
                                        </span>
                                    </div>
                                    <div className="sale-total">{formatCurrency(sale.total)}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-message">No hay compras en este período</p>
                    )}
                </div>

                <div className="top-products">
                    <h4>Productos Más Comprados</h4>
                    {detailedData.topProducts.length > 0 ? (
                        <ol className="products-list">
                            {detailedData.topProducts.map((product, index) => (
                                <li key={index} className="product-item">
                                    <span className="product-name">{product.name}</span>
                                    <span className="product-count">{product.count} veces</span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="empty-message">No hay datos de productos</p>
                    )}
                </div>
            </div>
        );
    };

    const renderClinicaTab = () => {
        if (!detailedData) return <LoaderSpinner />;

        return (
            <div className="modal-tab-content">
                <div className="clinica-summary">
                    <div className="summary-card">
                        <span className="label">Citas Clínicas</span>
                        <span className="value">{detailedData.summary.citasCount}</span>
                    </div>
                    <div className="summary-card">
                        <span className="label">Servicios de Peluquería</span>
                        <span className="value">{detailedData.summary.groomingCount}</span>
                    </div>
                    <div className="summary-card">
                        <span className="label">Engagement Score</span>
                        <span className="value">{customer.engagementScore}</span>
                    </div>
                </div>

                <div className="engagement-breakdown">
                    <h4>Desglose de Engagement</h4>
                    <div className="breakdown-grid">
                        <div className="breakdown-item">
                            <span className="breakdown-icon">📅</span>
                            <div className="breakdown-info">
                                <span className="breakdown-label">Citas Clínicas</span>
                                <span className="breakdown-value">{customer.breakdown.citas}</span>
                            </div>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-icon">✂️</span>
                            <div className="breakdown-info">
                                <span className="breakdown-label">Peluquería</span>
                                <span className="breakdown-value">{customer.breakdown.grooming}</span>
                            </div>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-icon">📋</span>
                            <div className="breakdown-info">
                                <span className="breakdown-label">Historias Clínicas</span>
                                <span className="breakdown-value">{customer.breakdown.historias}</span>
                            </div>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-icon">💊</span>
                            <div className="breakdown-info">
                                <span className="breakdown-label">Recetas</span>
                                <span className="breakdown-value">{customer.breakdown.recetas}</span>
                            </div>
                        </div>
                        <div className="breakdown-item">
                            <span className="breakdown-icon">🗓️</span>
                            <div className="breakdown-info">
                                <span className="breakdown-label">Vencimientos</span>
                                <span className="breakdown-value">{customer.breakdown.vencimientos}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {detailedData.citas.length > 0 && (
                    <div className="recent-appointments">
                        <h4>Últimas Citas</h4>
                        <div className="appointments-list">
                            {detailedData.citas.slice(0, 5).map((cita, index) => (
                                <div key={index} className="appointment-item">
                                    <span className="appointment-date">{formatDate(cita.startTime)}</span>
                                    <span className="appointment-patient">{cita.pacienteName}</span>
                                    <span className="appointment-services">
                                        {cita.services?.map(s => s.nombre || s.name).join(', ') || 'Consulta'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTrendsTab = () => (
        <div className="modal-tab-content">
            <div className="trends-container">
                <div className="trend-card">
                    <h4>Tendencia de Gasto</h4>
                    <div className="trend-indicator">
                        {customer.trend.spent.direction === 'up' && (
                            <div className="trend-positive">
                                <span className="trend-arrow">↑</span>
                                <span className="trend-value">+{customer.trend.spent.percentage}%</span>
                                <p>Incremento respecto al período anterior</p>
                            </div>
                        )}
                        {customer.trend.spent.direction === 'down' && (
                            <div className="trend-negative">
                                <span className="trend-arrow">↓</span>
                                <span className="trend-value">-{customer.trend.spent.percentage}%</span>
                                <p>Disminución respecto al período anterior</p>
                            </div>
                        )}
                        {customer.trend.spent.direction === 'stable' && (
                            <div className="trend-stable">
                                <span className="trend-arrow">→</span>
                                <span className="trend-value">Estable</span>
                                <p>Sin cambios significativos</p>
                            </div>
                        )}
                        {customer.trend.spent.direction === 'new' && (
                            <div className="trend-new">
                                <span className="trend-value">Nuevo</span>
                                <p>Cliente del período actual</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="trend-card">
                    <h4>Tendencia de Frecuencia</h4>
                    <div className="trend-indicator">
                        {customer.trend.frequency.direction === 'up' && (
                            <div className="trend-positive">
                                <span className="trend-arrow">↑</span>
                                <span className="trend-value">+{customer.trend.frequency.percentage}%</span>
                                <p>Compra más frecuentemente</p>
                            </div>
                        )}
                        {customer.trend.frequency.direction === 'down' && (
                            <div className="trend-negative">
                                <span className="trend-arrow">↓</span>
                                <span className="trend-value">-{customer.trend.frequency.percentage}%</span>
                                <p>Compra menos frecuentemente</p>
                            </div>
                        )}
                        {customer.trend.frequency.direction === 'stable' && (
                            <div className="trend-stable">
                                <span className="trend-arrow">→</span>
                                <span className="trend-value">Estable</span>
                                <p>Frecuencia constante</p>
                            </div>
                        )}
                    </div>
                </div>

                {customer.lastPurchase && (
                    <div className="last-purchase-info">
                        <h4>Última Compra</h4>
                        <p className="last-purchase-date">{formatDate(customer.lastPurchase)}</p>
                        <p className="last-purchase-note">
                            Hace {Math.floor((Date.now() - customer.lastPurchase.toDate().getTime()) / (1000 * 60 * 60 * 24))} días
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    const tabs = [
        { id: 'profile', label: 'Perfil', icon: <FaUser />, render: renderProfileTab },
        { id: 'compras', label: 'Compras', icon: <FaShoppingBag />, render: renderComprasTab },
        { id: 'clinica', label: 'Clínica', icon: <FaStethoscope />, render: renderClinicaTab },
        { id: 'trends', label: 'Tendencias', icon: <FaChartLine />, render: renderTrendsTab }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="customer-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>👤 {customer.tutorName} - Análisis Detallado</h2>
                    <button className="modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`modal-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="modal-body">
                    {isLoading && activeTab !== 'profile' ? (
                        <div className="modal-loading">
                            <LoaderSpinner />
                            <p>Cargando datos detallados...</p>
                        </div>
                    ) : (
                        tabs.find(tab => tab.id === activeTab)?.render()
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailModal;