import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';

const Filtrado = ({ onFilter }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [searchText, setSearchText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(''); // '' for All, 'true' for Active, 'false' for Inactive
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [catError, setCatError] = useState(null);

    const debounceTimeoutRef = React.useRef(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            setCatError(null);
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias || []
                }));
                setCategories(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
                setCatError('Error al cargar categorías.');
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const applyFilter = useCallback(() => {
        // Pass selectedStatus to the onFilter callback
        onFilter({ category: selectedCategory, subcategory: selectedSubcategory, text: searchText, status: selectedStatus });
    }, [selectedCategory, selectedSubcategory, searchText, selectedStatus, onFilter]);

    useEffect(() => {
        if (!isCatLoading) {
            applyFilter();
        }
    }, [selectedCategory, selectedSubcategory, selectedStatus, applyFilter, isCatLoading]); // Added selectedStatus

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        if (!isCatLoading) {
            debounceTimeoutRef.current = setTimeout(() => {
                applyFilter();
            }, 500);
        }
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchText, applyFilter, isCatLoading]);

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
        setSelectedSubcategory('');
    };

    const handleSubcategoryChange = (e) => {
        setSelectedSubcategory(e.target.value);
    };

    const handleSearchTextChange = (e) => {
        setSearchText(e.target.value);
    };

    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value);
    };

    const handleClearFilters = () => {
        setSelectedCategory('');
        setSelectedSubcategory('');
        setSearchText('');
        setSelectedStatus(''); // Clear status filter
    };

    const selectedCategoryObj = categories.find(cat => cat.adress === selectedCategory);
    const currentSubcategories = selectedCategoryObj?.subcategorias || [];

    return (
        <div className="filter-container">
            <div className="filter-controls">
                {/* Select Categoría */}
                <div className="filter-group">
                    <label htmlFor="category-select">Categoría</label>
                    <select
                        id="category-select"
                        className="filter-select"
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        disabled={isCatLoading || !!catError}
                    >
                        <option value="">{isCatLoading ? 'Cargando...' : catError ? 'Error' : 'Todas'}</option>
                        {!isCatLoading && !catError && categories.map((category) => (
                            <option key={category.adress} value={category.adress}>
                                {category.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Select Subcategoría */}
                {selectedCategory && currentSubcategories.length > 0 && (
                    <div className="filter-group">
                        <label htmlFor="subcategory-select">Subcategoría</label>
                        <select
                            id='subcategory-select'
                            className="filter-select"
                            value={selectedSubcategory}
                            onChange={handleSubcategoryChange}
                            disabled={!selectedCategory}
                        >
                            <option value="">Todas</option>
                            {currentSubcategories.map((subcategory) => (
                                <option key={subcategory} value={subcategory}>
                                    {subcategory}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Select Estado */}
                <div className="filter-group">
                    <label htmlFor="status-select">Estado</label>
                    <select
                        id="status-select"
                        className="filter-select"
                        value={selectedStatus}
                        onChange={handleStatusChange}
                        disabled={isCatLoading} // Can be enabled even if categories fail
                    >
                        <option value="">Todos</option>
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                    </select>
                </div>

                {/* Input Búsqueda */}
                <div className="filter-group filter-group-search">
                    <label htmlFor="search-input">Buscar</label>
                    <input
                        id='search-input'
                        className="filter-input"
                        type="text"
                        value={searchText}
                        onChange={handleSearchTextChange}
                        placeholder="Buscar producto..."
                        disabled={isCatLoading}
                    />
                </div>
            </div>

            {(selectedCategory || selectedSubcategory || searchText || selectedStatus) && ( // Added selectedStatus
                <button className="btn-clear-filters" onClick={handleClearFilters}>
                    Limpiar Filtros
                </button>
            )}
        </div>
    );
};

export default Filtrado;