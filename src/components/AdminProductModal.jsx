import React, { useEffect, useRef, useCallback } from 'react';
import Flickity from 'flickity';
import imagesLoaded from 'imagesloaded'; // Importar explícitamente
import 'flickity/css/flickity.css';
import { FaTimes } from 'react-icons/fa';

const AdminProductModal = ({ producto, isOpen, onClose }) => {
    const modalRef = useRef();
    const flickityRef = useRef(null);
    const flktyInstance = useRef(null);

    // Cerrar modal al hacer clic fuera (sin cambios)
    const handleClickOutside = useCallback((event) => {
        if (event.target.classList.contains('admin-modal') || (modalRef.current && !modalRef.current.contains(event.target))) {
            onClose();
        }
    }, [onClose]);

    // Efecto para Flickity y listeners
    useEffect(() => {
        let flickityNode = flickityRef.current; // Guardar nodo en variable local
        let currentInstance = flktyInstance.current; // Guardar instancia actual

        // Limpiar instancia anterior si existe (importante si React StrictMode re-ejecuta)
        if (currentInstance) {
             try {
                // console.log("[Flickity Cleanup] Destroying existing instance before init attempt.");
                currentInstance.destroy();
            } catch (error) {
                console.error("[Flickity Cleanup] Error destroying previous instance:", error);
            }
            flktyInstance.current = null;
        }


        if (isOpen && flickityNode) {
            document.addEventListener('mousedown', handleClickOutside);

            // Usar imagesLoaded explícitamente para más control
            const imgLoad = imagesLoaded(flickityNode);

            imgLoad.on('always', () => {
                 // console.log("[imagesLoaded] All images settled (loaded or failed). Attempting Flickity init.");
                 // Asegurarse que el nodo todavía existe y no hay ya una instancia
                 if (flickityNode && !flktyInstance.current) {
                    try {
                        // console.log("[Flickity Init] Initializing Flickity...");
                        flktyInstance.current = new Flickity(flickityNode, {
                            cellAlign: 'center',
                            contain: true,
                            pageDots: true,
                            prevNextButtons: true,
                            wrapAround: imagenesCarousel.length > 1, // Solo hacer wrapAround si hay más de 1 imagen
                            imagesLoaded: true // Mantener por si acaso, aunque usemos imagesLoaded manualmente
                        });
                        // console.log("[Flickity Init] Flickity initialized.");

                         // Forzar un resize después de la inicialización y carga de imágenes
                         requestAnimationFrame(() => {
                            if (flktyInstance.current) {
                                // console.log("[Flickity Resize] Resizing Flickity instance.");
                                flktyInstance.current.resize();
                            }
                         });

                    } catch (error) {
                       console.error("[Flickity Init] Error during Flickity initialization:", error);
                    }
                 }
            });

        } else {
            // Limpieza si isOpen cambia a false
            document.removeEventListener('mousedown', handleClickOutside);
        }

        // Función de limpieza del efecto
        return () => {
            // console.log("[Flickity Cleanup] Running effect cleanup...");
            document.removeEventListener('mousedown', handleClickOutside);
            if (flktyInstance.current) {
                 try {
                    // console.log("[Flickity Cleanup] Destroying instance on cleanup.");
                    flktyInstance.current.destroy();
                } catch (error) {
                     console.error("[Flickity Cleanup] Error destroying instance:", error);
                }
                flktyInstance.current = null;
            }
        };
    // Añadir producto.id a las dependencias fuerza la re-ejecución si cambia el producto,
    // lo cual limpiará y reiniciará Flickity.
    }, [isOpen, producto?.id, handleClickOutside]);

    // No renderizar si no está abierto o no hay producto
    if (!isOpen || !producto) return null;

    // Preparar imágenes y fallback
    const imagenesCarousel = [producto.imagen, producto.imagenB, producto.imagenC].filter(img => img && img.trim() !== '');
    const fallbackImage = "https://via.placeholder.com/400?text=Sin+Imagen";

    // DEBUG: console.log("Imagenes para carrusel:", imagenesCarousel);

    return (
        <div className={`admin-modal ${isOpen ? 'fade-in' : ''}`} onClick={handleClickOutside}>
            <div className="admin-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <button className="admin-modal-close-button" onClick={onClose} aria-label="Cerrar modal">
                    <FaTimes />
                </button>
                <div className="admin-modal-main-area">
                    <div className="admin-modal-carousel-column">
                        {/* Usar key en el contenedor puede ayudar a React a forzar el re-render */}
                        <div className="admin-carousel-container" key={producto.id}>
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
                    {/* Columna Info (sin cambios respecto a la v2) */}
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
                                 <p className="detail-section-title"><strong>Detalles:</strong></p>
                                {producto.categoria && (<div className="detail-item"><strong className="detail-label">Categoría:</strong> <span className="detail-value">{producto.categoria}</span></div>)}
                                {producto.subcategoria && (<div className="detail-item"><strong className="detail-label">Subcategoría:</strong> <span className="detail-value">{producto.subcategoria}</span></div>)}
                                {producto.categoryAdress && (<div className="detail-item"><strong className="detail-label">ID Categoría:</strong> <span className="detail-value">{producto.categoryAdress}</span></div>)}
                                {producto.id && (<div className="detail-item"><strong className="detail-label">ID Producto:</strong> <span className="detail-value">{producto.id}</span></div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProductModal;