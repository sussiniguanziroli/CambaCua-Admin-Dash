import React, { useEffect, useRef, useCallback } from 'react';
import Flickity from 'flickity';
import imagesLoaded from 'imagesloaded';
import 'flickity/css/flickity.css';
import { FaTimes } from 'react-icons/fa';

const AdminProductModal = ({ producto, isOpen, onClose }) => {
    const modalRef = useRef();
    const flickityRef = useRef(null);
    const flktyInstance = useRef(null);

    const handleClickOutside = useCallback((event) => {
        if (event.target.classList.contains('admin-modal') || (modalRef.current && !modalRef.current.contains(event.target))) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        let flickityNode = flickityRef.current;
        let currentInstance = flktyInstance.current;

        if (currentInstance) {
            try {
                currentInstance.destroy();
            } catch (error) {
                console.error("[Flickity Cleanup] Error destroying previous instance:", error);
            }
            flktyInstance.current = null;
        }

        if (isOpen && flickityNode) {
            document.addEventListener('mousedown', handleClickOutside);
            const imgLoad = imagesLoaded(flickityNode);

            imgLoad.on('always', () => {
                 if (flickityNode && !flktyInstance.current) {
                    try {
                        flktyInstance.current = new Flickity(flickityNode, {
                            cellAlign: 'center',
                            contain: true,
                            pageDots: true,
                            prevNextButtons: true,
                            wrapAround: imagenesCarousel.length > 1,
                            imagesLoaded: true 
                        });
                         requestAnimationFrame(() => {
                            if (flktyInstance.current) {
                                flktyInstance.current.resize();
                            }
                         });
                    } catch (error) {
                       console.error("[Flickity Init] Error during Flickity initialization:", error);
                    }
                 }
            });
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (flktyInstance.current) {
                 try {
                    flktyInstance.current.destroy();
                } catch (error) {
                     console.error("[Flickity Cleanup] Error destroying instance:", error);
                }
                flktyInstance.current = null;
            }
        };
    }, [isOpen, producto?.id, handleClickOutside, producto?.imagen, producto?.imagenB, producto?.imagenC]); // Added image URLs to dependencies

    if (!isOpen || !producto) return null;

    const imagenesCarousel = [producto.imagen, producto.imagenB, producto.imagenC].filter(img => img && img.trim() !== '');
    const fallbackImage = "https://via.placeholder.com/400?text=Sin+Imagen";

    // Helper function to format dates, accounts for Firestore Timestamps or JS Dates
    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        try {
            const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue); // Handle Firestore Timestamp and JS Date
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return date.toLocaleString('es-AR', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            });
        } catch (e) {
            console.error("Error formatting date:", dateValue, e);
            return 'Error al formatear fecha';
        }
    };


    return (
        <div className={`admin-modal ${isOpen ? 'fade-in' : ''}`} onClick={handleClickOutside}>
            <div className="admin-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <button className="admin-modal-close-button" onClick={onClose} aria-label="Cerrar modal">
                    <FaTimes />
                </button>
                <div className="admin-modal-main-area">
                    <div className="admin-modal-carousel-column">
                        <div className="admin-carousel-container" key={producto.id + '-carousel'}> {/* More unique key */}
                            <div className="admin-carousel" ref={flickityRef}>
                                {imagenesCarousel.length > 0 ? (
                                    imagenesCarousel.map((img, index) => (
                                        <div key={`${producto.id}-img-${index}`} className="admin-carousel-cell">
                                            <img src={img} alt={`${producto.nombre} - Imagen ${index + 1}`} onError={(e) => e.target.src = fallbackImage} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="admin-carousel-cell">
                                        <img src={fallbackImage} alt="Producto sin imagen" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="admin-modal-info-column">
                        <div className="admin-modal-header">
                            <h2>{producto.nombre}</h2>
                             <span className={`admin-product-status ${producto.activo ? 'active' : 'inactive'}`}>
                                {producto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div className="admin-modal-body">
                            <p className="admin-product-price">${producto.precio ? producto.precio.toFixed(2) : 'N/A'}</p>
                            <p className="admin-product-stock">
                                <strong>Stock:</strong> {producto.stock !== undefined ? `${producto.stock} unidades` : 'N/A'}
                            </p>
                             {producto.descripcion && (
                                <>
                                    <p className="detail-section-title"><strong>Descripción:</strong></p>
                                    <p className="admin-product-description">{producto.descripcion}</p>
                                </>
                            )}
                            <div className="admin-product-details">
                                 <p className="detail-section-title"><strong>Detalles Adicionales:</strong></p>
                                {producto.categoria && (<div className="detail-item"><strong className="detail-label">Categoría:</strong> <span className="detail-value">{producto.categoria}</span></div>)}
                                {producto.subcategoria && (<div className="detail-item"><strong className="detail-label">Subcategoría:</strong> <span className="detail-value">{producto.subcategoria}</span></div>)}
                                {producto.categoryAdress && (<div className="detail-item"><strong className="detail-label">ID Categoría:</strong> <span className="detail-value">{producto.categoryAdress}</span></div>)}
                                {producto.id && (<div className="detail-item"><strong className="detail-label">ID Producto:</strong> <span className="detail-value">{producto.id}</span></div>)}
                            </div>

                            {/* Timestamps Section */}
                            <div className="admin-product-timestamps" style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                                <p className="detail-section-title"><strong>Historial de Fechas:</strong></p>
                                <div className="detail-item">
                                    <strong className="detail-label">Creado:</strong> 
                                    <span className="detail-value">{formatDate(producto.createdAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <strong className="detail-label">Última Modificación General:</strong> 
                                    <span className="detail-value">{formatDate(producto.updatedAt)}</span>
                                </div>
                                <div className="detail-item">
                                    <strong className="detail-label">Última Modificación de Precio:</strong> 
                                    <span className="detail-value">{formatDate(producto.precioLastUpdated)}</span>
                                </div>
                                <div className="detail-item">
                                    <strong className="detail-label">Última Modificación de Stock:</strong> 
                                    <span className="detail-value">{formatDate(producto.stockLastUpdated)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProductModal;