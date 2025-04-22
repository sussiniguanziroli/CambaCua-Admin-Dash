import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2'; // Para posibles errores

const Filtrado = ({ onFilter }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [searchText, setSearchText] = useState('');
    const [isCatLoading, setIsCatLoading] = useState(true); // Estado carga categorías
    const [catError, setCatError] = useState(null); // Estado error categorías

    // Debounce timeout ref
    const debounceTimeoutRef = React.useRef(null);

    // Cargar categorías
    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            setCatError(null);
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias || [] // Asegurar que sea un array
                }));
                setCategories(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
                setCatError('Error al cargar categorías.');
                // Opcional: Notificar con Swal
                // Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las categorías.' });
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
    }, []);

    // Función para aplicar filtros (llamada por los useEffect)
    const applyFilter = useCallback(() => {
        onFilter({ category: selectedCategory, subcategory: selectedSubcategory, text: searchText });
    }, [selectedCategory, selectedSubcategory, searchText, onFilter]);

    // Aplicar filtro inmediatamente al cambiar categoría o subcategoría
    useEffect(() => {
        // No aplicar filtro si las categorías aún están cargando para evitar llamadas iniciales innecesarias
        if (!isCatLoading) {
             applyFilter();
        }
    }, [selectedCategory, selectedSubcategory, applyFilter, isCatLoading]);

     // Aplicar filtro con debounce al cambiar el texto de búsqueda
     useEffect(() => {
        // Limpiar el timeout anterior si existe
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Establecer un nuevo timeout solo si no estamos cargando categorías
        if (!isCatLoading) {
            debounceTimeoutRef.current = setTimeout(() => {
                applyFilter();
            }, 500); // Delay de 500ms
        }

        // Limpieza al desmontar o antes de la siguiente ejecución
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchText, applyFilter, isCatLoading]);

    // Manejador cambio categoría
    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
        setSelectedSubcategory(''); // Limpiar subcategoría
    };

    // Manejador cambio subcategoría
    const handleSubcategoryChange = (e) => {
        setSelectedSubcategory(e.target.value);
    };

    // Manejador cambio texto búsqueda
    const handleSearchTextChange = (e) => {
        setSearchText(e.target.value);
    };

    // Limpiar filtros
    const handleClearFilters = () => {
        setSelectedCategory('');
        setSelectedSubcategory('');
        setSearchText('');
        // No es necesario llamar a applyFilter aquí, el cambio de estado lo hará
    };

    // Encontrar subcategorías de la categoría seleccionada
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

                {/* Select Subcategoría (condicional) */}
                {selectedCategory && currentSubcategories.length > 0 && (
                     <div className="filter-group">
                         <label htmlFor="subcategory-select">Subcategoría</label>
                        <select
                            id='subcategory-select'
                            className="filter-select"
                            value={selectedSubcategory}
                            onChange={handleSubcategoryChange}
                            disabled={!selectedCategory} // Deshabilitado si no hay categoría
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
                        disabled={isCatLoading} // Deshabilitado mientras cargan categorías iniciales
                    />
                </div>
            </div>

             {/* Botón Limpiar Filtros */}
             {(selectedCategory || selectedSubcategory || searchText) && (
                 <button className="btn-clear-filters" onClick={handleClearFilters}>
                     Limpiar Filtros
                 </button>
             )}
        </div>
    );
};

export default Filtrado;