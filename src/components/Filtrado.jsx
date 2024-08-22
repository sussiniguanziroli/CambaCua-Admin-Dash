import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const Filtrado = ({ onFilter }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [searchText, setSearchText] = useState('');

    // Fetch categories only once when component mounts
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCategories(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
            }
        };

        fetchCategories();
    }, []);

    // Use callback to memoize filter function to prevent unnecessary re-renders
    const handleFilterChange = useCallback(() => {
        onFilter({ category: selectedCategory, subcategory: selectedSubcategory, text: searchText });
    }, [selectedCategory, selectedSubcategory, searchText, onFilter]);

    useEffect(() => {
        handleFilterChange();
    }, [handleFilterChange]);

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
        setSelectedSubcategory(''); // Reset subcategoría cuando cambia la categoría
    };

    const handleSubcategoryChange = (e) => {
        setSelectedSubcategory(e.target.value);
    };

    const handleSearchTextChange = (e) => {
        setSearchText(e.target.value);
    };

    const selectedCategoryObj = categories.find(cat => cat.id === selectedCategory);

    return (
        <div className="filter-container">
            <select className="filter-select" value={selectedCategory} onChange={handleCategoryChange}>
                <option value="">Todas las Categorías</option>
                {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                        {category.nombre}
                    </option>
                ))}
            </select>

            {selectedCategoryObj && (
                <select className="filter-select" value={selectedSubcategory} onChange={handleSubcategoryChange}>
                    <option value="">Todas las Subcategorías</option>
                    {selectedCategoryObj.subcategorias.map((subcategory, index) => (
                        <option key={index} value={subcategory}>
                            {subcategory}
                        </option>
                    ))}
                </select>
            )}

            <input
                className="filter-input"
                type="text"
                value={searchText}
                onChange={handleSearchTextChange}
                placeholder="Buscar por texto..."
            />
        </div>
    );
};

export default Filtrado;
