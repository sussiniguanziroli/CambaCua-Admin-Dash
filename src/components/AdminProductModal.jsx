import React, { useEffect, useRef, useCallback } from 'react';
import Flickity from 'flickity';
import 'flickity/css/flickity.css';
// Considerar importar imagesloaded si Flickity no lo incluye y tienes problemas
// import imagesLoaded from 'imagesloaded';
import { FaTimes } from 'react-icons/fa';

const AdminProductModal = ({ producto, isOpen, onClose }) => {
    const modalRef = useRef();
    const flickityRef = useRef(null);
    const flktyInstance = useRef(null);

    // Cerrar modal al hacer clic fuera
    const handleClickOutside = useCallback((event) => {
        // Verificar si el clic fue sobre el overlay (el div .admin-modal) directamente
        // O si fue fuera del .admin-modal-content
        if (event.target.classList.contains('admin-modal') || (modalRef.current && !modalRef.current.contains(event.target))) {
            onClose();
        }
    }, [onClose]); // Incluir onClose en las dependencias de useCallback

    // Efecto para Flickity y listeners
    useEffect(() => {
        let timerId = null;
        let currentFlickityNode = flickityRef.current; // Guardar referencia al nodo actual

        if (isOpen && currentFlickityNode) {
            document.addEventListener('mousedown', handleClickOutside);

            // Inicializar Flickity
            timerId = setTimeout(() => {
                if (currentFlickityNode && !flktyInstance.current) {
                    try {
                        flktyInstance.current = new Flickity(currentFlickityNode, {
                            cellAlign: 'center',
                            contain: true,
                            pageDots: true,
                            prevNextButtons: true,
                            wrapAround: true,
                            imagesLoaded: true // Añadido: Espera a que las imágenes carguen
                        });
                        // Forzar resize después de que las imágenes carguen puede ser más fiable
                        flktyInstance.current.once('imagesLoaded', () => {
                             if (flktyInstance.current) { // Verificar si aún existe la instancia
                                flktyInstance.current.resize();
                             }
                        });
                       // Si imagesLoaded falla o no se usa, un resize simple después de init
                       // flktyInstance.current.resize();
                    } catch (error) {
                       console.error("Error inicializando Flickity:", error);
                    }
                }
            }, 50); // Pequeño delay

        } else {
             // Limpieza si isOpen cambia a false ANTES del return del efecto
             document.removeEventListener('mousedown', handleClickOutside);
              if (flktyInstance.current) {
                try {
                    flktyInstance.current.destroy();
                } catch (error) {
                     console.error("Error destruyendo Flickity al cerrar:", error);
                }
                flktyInstance.current = null;
            }
        }

        // Función de limpieza del efecto
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleClickOutside);
            // Usar la referencia guardada para la limpieza por si el nodo cambia rápido
            if (flktyInstance.current) {
                 try {
                    flktyInstance.current.destroy();
                } catch (error) {
                     console.error("Error destruyendo Flickity en cleanup:", error);
                }
                flktyInstance.current = null;
            }
        };
    }, [isOpen, handleClickOutside]); // Depender de isOpen y la función memoizada handleClickOutside

    // No renderizar si no está abierto o no hay producto
    if (!isOpen || !producto) return null;

    // Preparar imágenes y fallback
    const imagenesCarousel = [producto.imagen, producto.imagenB, producto.imagenC].filter(img => img && img.trim() !== '');
    const fallbackImage = "https://via.placeholder.com/400?text=Sin+Imagen";

    return (
        // Añadida clase fade-in directamente basada en isOpen para controlar animación CSS
        <div className={`admin-modal ${isOpen ? 'fade-in' : ''}`} onClick={handleClickOutside} /* Añadido listener aquí también */ >
            <div className="admin-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()} /* Evitar que clic dentro cierre */ >
                {/* Botón Cerrar */}
                <button className="admin-modal-close-button" onClick={onClose} aria-label="Cerrar modal">
                    <FaTimes />
                </button>

                {/* Área Principal (columnas) */}
                <div className="admin-modal-main-area">
                    {/* Columna Carrusel */}
                    <div className="admin-modal-carousel-column">
                        {/* Añadir un contenedor con key basada en producto.id puede forzar reinicio si cambia el producto */}
                        <div className="admin-carousel" ref={flickityRef} key={producto.id}>
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

                    {/* Columna Información */}
                    <div className="admin-modal-info-column">
                        {/* Encabezado */}
                        <div className="admin-modal-header">
                            <h2>{producto.nombre}</h2>
                             <span className={`admin-product-status ${producto.activo ? 'active' : 'inactive'}`}>
                                {producto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>

                        {/* Cuerpo */}
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