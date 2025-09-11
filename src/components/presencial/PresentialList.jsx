import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaPlus, FaTimes, FaEdit, FaTrash, FaBox, FaHandHoldingMedical } from 'react-icons/fa';

const PresentialList = () => {
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [productCategories, setProductCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);

    const [filters, setFilters] = useState({
        text: '',
        tipo: 'todos',
        category: 'todas',
    });

    const fetchItemsAndCategories = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const itemsSnapshot = await getDocs(collection(db, 'productos_presenciales'));
            const itemsData = itemsSnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            const prodCatsSnap = await getDocs(collection(db, 'categories'));
            const prodCats = prodCatsSnap.docs.map(docSnap => ({
                adress: docSnap.data().adress,
                nombre: docSnap.data().nombre
            }));

            const servCatsSnap = await getDocs(collection(db, 'services_categories'));
            const servCats = servCatsSnap.docs.map(docSnap => ({
                adress: docSnap.data().adress,
                nombre: docSnap.data().nombre
            }));

            setItems(itemsData);
            setFilteredItems(itemsData);
            setProductCategories(prodCats);
            setServiceCategories(servCats);
        } catch (err) {
            setError('No se pudieron cargar los datos.');
            Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar los items o categorías.' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItemsAndCategories();
    }, [fetchItemsAndCategories]);
    
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const clearFilters = () => {
        setFilters({ text: '', tipo: 'todos', category: 'todas' });
    };

    useEffect(() => {
        let tempItems = [...items];
        if (filters.text) {
            const lowerText = filters.text.toLowerCase();
            tempItems = tempItems.filter(item =>
                item.name.toLowerCase().includes(lowerText) ||
                item.description.toLowerCase().includes(lowerText)
            );
        }
        if (filters.tipo !== 'todos') {
            tempItems = tempItems.filter(item => item.tipo === filters.tipo);
        }
        if (filters.category !== 'todas') {
            tempItems = tempItems.filter(item => item.category === filters.category);
        }
        setFilteredItems(tempItems);
    }, [filters, items]);

    const deleteItem = async (itemToDelete) => {
        const result = await Swal.fire({
            title: `¿Eliminar "${itemToDelete.name}"?`,
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E57373',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'productos_presenciales', itemToDelete.id));
                Swal.fire({ title: 'Eliminado', text: `"${itemToDelete.name}" ha sido eliminado.`, icon: 'success', timer: 1500, showConfirmButton: false });
                fetchItemsAndCategories();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo eliminar "${itemToDelete.name}".` });
            }
        }
    };

    const resolveCategoryName = (item) => {
        if (item.tipo === 'producto') {
            const cat = productCategories.find(c => c.adress === item.category);
            return cat ? cat.nombre : item.category;
        } else {
            const cat = serviceCategories.find(c => c.adress === item.category);
            return cat ? cat.nombre : item.category;
        }
    };

    return (
        <div className="presential-container">
            <div className="page-header">
                <h1>Items de Venta Presencial</h1>
                <Link to="/admin/add-presential" className="btn btn-primary">
                    <FaPlus /> Agregar Nuevo Item
                </Link>
            </div>
            
            <div className="filter-bar">
                <div className="filter-group">
                    <label htmlFor="text-filter">Buscar</label>
                    <input type="text" id="text-filter" name="text" value={filters.text} onChange={handleFilterChange} placeholder="Nombre o descripción..." />
                </div>
                 <div className="filter-group">
                    <label htmlFor="tipo-filter">Tipo</label>
                    <select id="tipo-filter" name="tipo" value={filters.tipo} onChange={handleFilterChange}>
                        <option value="todos">Todos</option>
                        <option value="producto">Producto</option>
                        <option value="servicio">Servicio</option>
                    </select>
                </div>
                 <div className="filter-group">
                    <label htmlFor="category-filter">Categoría</label>
                    <select id="category-filter" name="category" value={filters.category} onChange={handleFilterChange}>
                        <option value="todas">Todas</option>
                        {(filters.tipo === 'servicio' ? serviceCategories : productCategories)
                            .map(cat => <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>)}
                    </select>
                </div>
                <button className="btn btn-secondary" onClick={clearFilters}><FaTimes/> Limpiar</button>
            </div>

            {isLoading && <p className="loading-message">Cargando items...</p>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && !error && (
                <div className="presential-list">
                    {filteredItems.length > 0 ? filteredItems.map(item => (
                        <div key={item.id} className="presential-card">
                           <div className="card-header">
                               <span className={`type-badge ${item.tipo}`}>
                                {item.tipo === 'producto' ? <FaBox/> : <FaHandHoldingMedical/>} {item.tipo}
                               </span>
                               <h3>{item.name}</h3>
                           </div>
                           <p className="card-description">{item.description}</p>
                           <div className="card-footer">
                                <div className="card-info">
                                    <span className="price">${item.price.toLocaleString('es-AR')}</span>
                                    <span className="category">{resolveCategoryName(item)} {item.subcat && `> ${item.subcat}`}</span>
                                </div>
                                <div className="card-actions">
                                    <Link to={`/admin/edit-presential/${item.id}`} className="btn btn-edit"><FaEdit/></Link>
                                    <button onClick={() => deleteItem(item)} className="btn btn-delete"><FaTrash/></button>
                                </div>
                           </div>
                        </div>
                    )) : (
                        <p className="no-results-message">No se encontraron items que coincidan con los filtros.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PresentialList;