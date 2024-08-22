import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const Filtrado = ({ onFilter }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias
                }));
                setCategories(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
            }
        };

        fetchCategories();
    }, []);

    const handleFilterChange = useCallback(() => {
        onFilter({ category: selectedCategory, subcategory: selectedSubcategory, text: searchText });
    }, [selectedCategory, selectedSubcategory, searchText, onFilter]);

    useEffect(() => {
        handleFilterChange();
    }, [handleFilterChange]);

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

    const selectedCategoryObj = categories.find(cat => cat.adress === selectedCategory);

    return (
        <div className="filter-container">
            <select className="filter-select" value={selectedCategory} onChange={handleCategoryChange}>
                <option value="">Todas las Categorías</option>
                {categories.map((category) => (
                    <option key={category.adress} value={category.adress}>
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
