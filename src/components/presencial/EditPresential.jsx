import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const EditPresential = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [tipo, setTipo] = useState('producto');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [subcat, setSubcat] = useState('');
    
    const [categoriasDb, setCategoriasDb] = useState([]);
    const [subcategoriasDb, setSubcategoriasDb] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCategories = useCallback(async () => {
        setIsCatLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = snapshot.docs.map(doc => ({
                adress: doc.data().adress,
                subcategorias: doc.data().subcategorias || []
            }));
            setCategoriasDb(categoriesData);
            return categoriesData;
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar las categorías.' });
            return [];
        } finally {
            setIsCatLoading(false);
        }
    }, []);

    const fetchItemData = useCallback(async (categories) => {
        setIsDataLoading(true);
        try {
            const itemRef = doc(db, 'productos_presenciales', id);
            const itemSnap = await getDoc(itemRef);

            if (itemSnap.exists()) {
                const data = itemSnap.data();
                setTipo(data.tipo);
                setName(data.name);
                setDescription(data.description);
                setPrice(data.price.toString());
                setCategory(data.category);
                setSubcat(data.subcat || '');
                
                const selectedCat = categories.find(cat => cat.adress === data.category);
                if (selectedCat) {
                    setSubcategoriasDb(selectedCat.subcategorias);
                }
            } else {
                Swal.fire("Error", "Item no encontrado.", "error");
                navigate('/admin/presential');
            }
        } catch (error) {
            Swal.fire("Error", "No se pudieron cargar los datos del item.", "error");
        } finally {
            setIsDataLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchCategories().then(categoriesData => {
            fetchItemData(categoriesData);
        });
    }, [fetchCategories, fetchItemData]);
    
    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categoriasDb.find(cat => cat.adress === selectedAdress);
        setCategory(selectedAdress);
        setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
        setSubcat('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'productos_presenciales', id), {
                tipo,
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                category,
                subcat
            });
            Swal.fire({ title: "Item Actualizado", icon: "success" });
            navigate('/admin/presential');
        } catch (error) {
            Swal.fire("Error", "Hubo un problema al actualizar el item.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isDataLoading) {
        return <p className="loading-message">Cargando datos del item...</p>;
    }

    return (
        <div className="presential-form-container">
            <h2>Editar Item Presencial</h2>
            <form onSubmit={handleSubmit} className="presential-form">
                <div className="form-group">
                    <label>Tipo de Item</label>
                    <div className="radio-group">
                        <label>
                            <input type="radio" value="producto" checked={tipo === 'producto'} onChange={(e) => setTipo(e.target.value)} />
                            Producto
                        </label>
                        <label>
                            <input type="radio" value="servicio" checked={tipo === 'servicio'} onChange={(e) => setTipo(e.target.value)} />
                            Servicio
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="name">Nombre</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Descripción</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label htmlFor="price">Precio</label>
                    <input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" />
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="category">Categoría</label>
                        <select id="category" value={category} onChange={handleCategoriaChange} required disabled={isCatLoading}>
                            <option value="">{isCatLoading ? 'Cargando...' : 'Seleccionar Categoría'}</option>
                            {categoriasDb.map(cat => <option key={cat.adress} value={cat.adress}>{cat.adress}</option>)}
                        </select>
                    </div>

                    {subcategoriasDb.length > 0 && (
                        <div className="form-group">
                            <label htmlFor="subcat">Subcategoría</label>
                            <select id="subcat" value={subcat} onChange={(e) => setSubcat(e.target.value)}>
                                <option value="">Seleccionar Subcategoría (Opcional)</option>
                                {subcategoriasDb.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Actualizando...' : 'Actualizar Item'}
                </button>
            </form>
        </div>
    );
};

export default EditPresential;

