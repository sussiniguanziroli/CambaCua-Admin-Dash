import React, { useState, useMemo } from 'react';
import RankingCard from './RankingCard';
import { FaTrophy, FaShoppingCart, FaHeartbeat } from 'react-icons/fa';

const TopCustomersTab = ({ data, speciesLabel, onViewDetail, isLoading }) => {
    const [displayCount, setDisplayCount] = useState(10);
    const [expandedSection, setExpandedSection] = useState('spent');

    const sections = useMemo(() => [
        {
            id: 'spent',
            title: 'Ranking por Gasto Total',
            icon: <FaTrophy />,
            data: data?.bySpent || [],
            emptyMessage: 'No hay datos de gasto disponibles'
        },
        {
            id: 'frequency',
            title: 'Ranking por Frecuencia de Compra',
            icon: <FaShoppingCart />,
            data: data?.byFrequency || [],
            emptyMessage: 'No hay datos de frecuencia disponibles'
        },
        {
            id: 'engagement',
            title: 'Ranking por Engagement Clínico',
            icon: <FaHeartbeat />,
            data: data?.byEngagement || [],
            emptyMessage: 'No hay datos de engagement disponibles'
        }
    ], [data]);

    const handleShowMore = (sectionId) => {
        setDisplayCount(prev => prev + 10);
    };

    const handleShowLess = (sectionId) => {
        setDisplayCount(10);
    };

    if (isLoading) {
        return (
            <div className="top-customers-loading">
                <div className="loading-spinner"></div>
                <p>Cargando estadísticas de {speciesLabel}...</p>
            </div>
        );
    }

    return (
        <div className="top-customers-tab">
            <div className="tab-header">
                <h2>🏆 Top Customers - {speciesLabel}</h2>
                <p className="tab-subtitle">
                    {data?.all?.length || 0} tutores encontrados
                </p>
            </div>

            <div className="rankings-container">
                {sections.map(section => {
                    const displayData = section.data.slice(0, displayCount);
                    const hasMore = section.data.length > displayCount;
                    const isExpanded = expandedSection === section.id;

                    return (
                        <div key={section.id} className={`ranking-section ${isExpanded ? 'expanded' : ''}`}>
                            <div 
                                className="ranking-section-header"
                                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                            >
                                <div className="header-left">
                                    <span className="section-icon">{section.icon}</span>
                                    <h3>{section.title}</h3>
                                </div>
                                <div className="header-right">
                                    <span className="section-count">{section.data.length} tutores</span>
                                    <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="ranking-section-content">
                                    {displayData.length > 0 ? (
                                        <>
                                            <div className="ranking-list">
                                                {displayData.map((customer, index) => (
                                                    <RankingCard
                                                        key={customer.tutorId}
                                                        customer={customer}
                                                        position={index + 1}
                                                        onViewDetail={onViewDetail}
                                                        rankingType={section.id}
                                                    />
                                                ))}
                                            </div>

                                            {(hasMore || displayCount > 10) && (
                                                <div className="ranking-actions">
                                                    {hasMore && (
                                                        <button 
                                                            className="btn-show-more"
                                                            onClick={() => handleShowMore(section.id)}
                                                        >
                                                            Mostrar más ({section.data.length - displayCount} restantes)
                                                        </button>
                                                    )}
                                                    {displayCount > 10 && (
                                                        <button 
                                                            className="btn-show-less"
                                                            onClick={() => handleShowLess(section.id)}
                                                        >
                                                            Mostrar menos
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="empty-ranking">
                                            <p>{section.emptyMessage}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TopCustomersTab;