import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowUp, FaArrowDown, FaMinus, FaEye, FaUser } from 'react-icons/fa';

const RankingCard = ({ customer, position, onViewDetail, rankingType }) => {
    const navigate = useNavigate();

    const getTrendIcon = (trend) => {
        if (!trend) return <FaMinus className="trend-icon stable" />;
        
        switch(trend.direction) {
            case 'up':
                return <FaArrowUp className="trend-icon up" />;
            case 'down':
                return <FaArrowDown className="trend-icon down" />;
            default:
                return <FaMinus className="trend-icon stable" />;
        }
    };

    const getTrendClass = (trend) => {
        if (!trend) return 'stable';
        return trend.direction;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    };

    const getMainMetric = () => {
        switch(rankingType) {
            case 'spent':
                return {
                    value: formatCurrency(customer.totalSpent),
                    label: 'Gasto Total',
                    trend: customer.trend.spent
                };
            case 'frequency':
                return {
                    value: `${customer.purchaseCount} compras`,
                    label: 'Frecuencia',
                    trend: customer.trend.frequency
                };
            case 'engagement':
                return {
                    value: `Score: ${customer.engagementScore}`,
                    label: 'Engagement',
                    trend: customer.trend.engagement
                };
            default:
                return { value: '-', label: '-', trend: null };
        }
    };

    const mainMetric = getMainMetric();

    return (
        <div className={`ranking-card ${getTrendClass(mainMetric.trend)}`}>
            <div className="ranking-position">
                <span className="position-number">#{position}</span>
            </div>

            <div className="ranking-content">
                <div className="customer-info">
                    <h3 className="customer-name">{customer.tutorName}</h3>
                    <div className="customer-meta">
                        <span className="meta-item">{customer.purchaseCount} compras</span>
                        <span className="meta-separator">•</span>
                        <span className="meta-item">Ticket: {formatCurrency(customer.avgTicket)}</span>
                    </div>
                    {customer.species && customer.species.length > 0 && (
                        <div className="species-badges">
                            {customer.species.map((s, i) => (
                                <span key={i} className={`species-badge ${s === 'Canino' ? 'canino' : 'felino'}`}>
                                    {s}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ranking-metric">
                    <div className="metric-value">
                        {mainMetric.value}
                        {mainMetric.trend && mainMetric.trend.percentage !== 0 && (
                            <span className={`trend-badge ${mainMetric.trend.direction}`}>
                                {getTrendIcon(mainMetric.trend)}
                                {mainMetric.trend.percentage}%
                            </span>
                        )}
                    </div>
                    {rankingType === 'engagement' && (
                        <div className="engagement-breakdown">
                            <span>{customer.breakdown.citas} citas</span>
                            <span>•</span>
                            <span>{customer.breakdown.historias} historias</span>
                            <span>•</span>
                            <span>{customer.breakdown.recetas} recetas</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="ranking-actions">
                <button 
                    className="btn-action btn-detail" 
                    onClick={() => onViewDetail(customer)}
                    title="Ver detalle completo"
                >
                    <FaEye />
                    <span>Detalle</span>
                </button>
                <button 
                    className="btn-action btn-profile" 
                    onClick={() => navigate(`/admin/tutor-profile/${customer.tutorId}`)}
                    title="Ir al perfil"
                >
                    <FaUser />
                    <span>Perfil</span>
                </button>
            </div>
        </div>
    );
};

export default RankingCard;