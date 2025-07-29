import React, { useState, useEffect, useRef, useCallback } from 'react';
import Flickity from 'flickity';
import imagesLoaded from 'imagesloaded';
import 'flickity/css/flickity.css';
import { FaTimes } from 'react-icons/fa';

const AdminProductModal = ({ producto, isOpen, onClose }) => {
    const modalRef = useRef();
    const flickityRef = useRef(null);
    const flktyInstance = useRef(null);

    const [selectedVariation, setSelectedVariation] = useState(null);
    const [availableAttributes, setAvailableAttributes] = useState({});
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [lastSelectedAttributeChanged, setLastSelectedAttributeChanged] = useState(null); // To track which attribute was last clicked

    const handleClickOutside = useCallback((event) => {
        if (event.target.classList.contains('admin-modal') || (modalRef.current && !modalRef.current.contains(event.target))) {
            onClose();
        }
    }, [onClose]);

    // Initialize or re-initialize Flickity
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

        const imagesToLoad = selectedVariation ?
            [selectedVariation.imagen, selectedVariation.imagenB, selectedVariation.imagenC].filter(img => img && img.trim() !== '') :
            [producto.imagen, producto.imagenB, producto.imagenC].filter(img => img && img.trim() !== '');

        if (isOpen && flickityNode && imagesToLoad.length > 0) {
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
                            wrapAround: imagesToLoad.length > 1,
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
    }, [isOpen, producto?.id, handleClickOutside, selectedVariation, producto?.imagen, producto?.imagenB, producto?.imagenC]);


    // Initialize variations and attributes when product changes
    useEffect(() => {
        if (producto && producto.hasVariations && producto.variationsList && producto.variationsList.length > 0) {
            // Extract all unique attribute names and their values
            const attributes = {};
            producto.variationsList.forEach(v => {
                if (v.attributes) {
                    Object.entries(v.attributes).forEach(([name, value]) => {
                        if (!attributes[name]) {
                            attributes[name] = new Set();
                        }
                        attributes[name].add(value);
                    });
                }
            });

            const processedAttributes = {};
            Object.entries(attributes).forEach(([name, valuesSet]) => {
                processedAttributes[name] = Array.from(valuesSet);
            });
            setAvailableAttributes(processedAttributes);

            // Set initial selected attributes to the first available for each attribute type
            const initialSelectedAttrs = {};
            Object.entries(processedAttributes).forEach(([attrName, attrValues]) => {
                if (attrValues.length > 0) {
                    initialSelectedAttrs[attrName] = attrValues[0];
                }
            });
            setSelectedAttributes(initialSelectedAttrs);

            // Find the initial selected variation based on these initial attributes
            const initialVar = producto.variationsList.find(v => {
                if (!v.attributes) return false;
                return Object.entries(initialSelectedAttrs).every(([attrName, attrValue]) => {
                    return v.attributes[attrName] === attrValue;
                });
            }) || producto.variationsList.find(v => v.activo) || producto.variationsList[0]; // Fallback to any active, then first
            setSelectedVariation(initialVar);

        } else {
            setSelectedVariation(null);
            setAvailableAttributes({});
            setSelectedAttributes({});
        }
    }, [producto]);

    // Filter variations based on selected attributes
    useEffect(() => {
        if (producto && producto.hasVariations && producto.variationsList && producto.variationsList.length > 0) {
            const filtered = producto.variationsList.filter(v => {
                if (!v.attributes) return false;
                return Object.entries(selectedAttributes).every(([attrName, attrValue]) => {
                    return v.attributes[attrName] === attrValue;
                });
            });

            // If filtering results in no match, or if the currently selected variation is no longer valid,
            // try to find a new best match based on current selections.
            let newSelected = null;
            if (filtered.length > 0) {
                // Prioritize active variations among the filtered ones
                newSelected = filtered.find(v => v.activo) || filtered[0];
            } else {
                // If no direct match, try to find a variation that matches as many selected attributes as possible,
                // or just default to the first active/first overall variation.
                // This is a more complex fallback for partial matches if needed, but for now,
                // we'll just ensure a variation is selected if possible.
                newSelected = producto.variationsList.find(v => v.activo) || producto.variationsList[0];
            }

            // Only update selectedVariation if it's different from the current one
            // This prevents unnecessary re-renders and Flickity re-initializations
            if (newSelected && newSelected.id !== selectedVariation?.id) {
                setSelectedVariation(newSelected);
            } else if (!newSelected && selectedVariation) {
                // If no variation can be selected, and one was previously selected, clear it
                setSelectedVariation(null);
            }
        }
    }, [selectedAttributes, producto, selectedVariation]);


    if (!isOpen || !producto) return null;

    const currentDisplayProduct = producto.hasVariations ? selectedVariation : producto;

    const imagenesCarousel = currentDisplayProduct ?
        [currentDisplayProduct.imagen, currentDisplayProduct.imagenB, currentDisplayProduct.imagenC].filter(img => img && img.trim() !== '') :
        [];
    const fallbackImage = "https://via.placeholder.com/400?text=Sin+Imagen";

    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        try {
            // Handle both Firestore Timestamps and ISO strings
            const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
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

    const handleAttributeButtonClick = (attrName, attrValue) => {
        setSelectedAttributes(prev => {
            const newSelected = {
                ...prev,
                [attrName]: attrValue
            };
            // If the same attribute value is clicked again, deselect it
            if (prev[attrName] === attrValue) {
                const { [attrName]: _, ...rest } = prev;
                return rest;
            }
            return newSelected;
        });
        setLastSelectedAttributeChanged(attrName); // Track the last attribute changed
    };

    return (
        <div className={`admin-modal ${isOpen ? 'fade-in' : ''}`} onClick={handleClickOutside}>
            <div className="admin-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <button className="admin-modal-close-button" onClick={onClose} aria-label="Cerrar modal">
                    <FaTimes />
                </button>
                <div className="admin-modal-main-area">
                    <div className="admin-modal-carousel-column">
                        <div className="admin-carousel-container" key={currentDisplayProduct?.id + '-carousel'}>
                            <div className="admin-carousel" ref={flickityRef}>
                                {imagenesCarousel.length > 0 ? (
                                    imagenesCarousel.map((img, index) => (
                                        <div key={`${currentDisplayProduct?.id}-img-${index}`} className="admin-carousel-cell">
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
                            {producto.hasVariations && availableAttributes && Object.keys(availableAttributes).length > 0 && (
                                <div className="variation-filters" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                                    <h4>Seleccionar Variación:</h4>
                                    {Object.entries(availableAttributes).map(([attrName, attrValues]) => (
                                        <div key={attrName} style={{ marginBottom: '10px' }}>
                                            <strong>{attrName}:</strong>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                                                {attrValues.map(value => {
                                                    // Determine if this attribute value is part of any *possible* valid combination
                                                    // based on *other* currently selected attributes.
                                                    const isPossibleCombination = producto.variationsList.some(v => {
                                                        if (!v.attributes) return false;
                                                        // Create a temporary set of attributes to check for this specific button's value
                                                        const tempSelected = { ...selectedAttributes, [attrName]: value };

                                                        // Check if this variation matches ALL attributes in tempSelected
                                                        return Object.entries(tempSelected).every(([key, val]) => {
                                                            return v.attributes[key] === val;
                                                        });
                                                    });

                                                    // Determine if this specific combination (all selected attributes + this one) leads to an active variation
                                                    const isCombinationActive = producto.variationsList.some(v => {
                                                        if (!v.attributes) return false;
                                                        const combinedAttrs = { ...selectedAttributes, [attrName]: value };
                                                        return v.activo && Object.entries(combinedAttrs).every(([key, val]) => v.attributes && v.attributes[key] === val);
                                                    });

                                                    const isSelected = selectedAttributes[attrName] === value;
                                                    const isDisabled = !isPossibleCombination;

                                                    return (
                                                        <button
                                                            key={value}
                                                            className={`attribute-button ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => handleAttributeButtonClick(attrName, value)}
                                                            disabled={isDisabled}
                                                            style={{
                                                                padding: '8px 12px',
                                                                border: '1px solid #ccc',
                                                                borderRadius: '5px',
                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                backgroundColor: isSelected ? '#007bff' : (isDisabled ? '#e0e0e0' : '#f0f0f0'),
                                                                color: isSelected ? 'white' : (isDisabled ? '#888' : 'black'),
                                                                opacity: isDisabled ? 0.6 : 1,
                                                                transition: 'background-color 0.2s, color 0.2s, opacity 0.2s'
                                                            }}
                                                        >
                                                            {value}
                                                            {!isCombinationActive && isPossibleCombination && ( // Only show "Inactivo" if it's a possible combination but not active
                                                                <span style={{ marginLeft: '5px', fontSize: '0.8em', color: isSelected ? 'white' : '#d33' }}> (Inactivo)</span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {currentDisplayProduct ? (
                                <>
                                    <p className="admin-product-price">${currentDisplayProduct.precio ? currentDisplayProduct.precio.toFixed(2) : 'N/A'}</p>
                                    <p className="admin-product-stock">
                                        <strong>Stock:</strong> {currentDisplayProduct.stock !== undefined ? `${currentDisplayProduct.stock} unidades` : 'N/A'}
                                    </p>
                                    {producto.hasVariations && (
                                        <p className={`admin-product-status ${currentDisplayProduct.activo ? 'active' : 'inactive'}`}>
                                            <strong>Estado de Variación:</strong> {currentDisplayProduct.activo ? 'Activa' : 'Inactiva'}
                                        </p>
                                    )}
                                    {producto.hasVariations && currentDisplayProduct.attributes && Object.keys(currentDisplayProduct.attributes).length > 0 && (
                                        <div className="current-variation-attributes" style={{ marginTop: '10px', marginBottom: '15px' }}>
                                            <strong>Atributos de la Variación:</strong>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                                                {Object.entries(currentDisplayProduct.attributes).map(([key, value]) => (
                                                    <span key={key} className="attribute-tag" style={{
                                                        padding: '5px 10px',
                                                        backgroundColor: '#e9ecef',
                                                        borderRadius: '3px',
                                                        fontSize: '0.9em'
                                                    }}>{key}: {value}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p>No se encontró una variación que coincida con los filtros seleccionados.</p>
                            )}

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
                                {/* Mostrar fechas de variación si aplica */}
                                {currentDisplayProduct && (
                                    <>
                                        <div className="detail-item">
                                            <strong className="detail-label">Última Modificación de Precio (Variación):</strong>
                                            <span className="detail-value">{formatDate(currentDisplayProduct.precioLastUpdated)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <strong className="detail-label">Última Modificación de Stock (Variación):</strong>
                                            <span className="detail-value">{formatDate(currentDisplayProduct.stockLastUpdated)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProductModal;
