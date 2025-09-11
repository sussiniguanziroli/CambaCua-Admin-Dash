import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const AddPresential = () => {
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            try {
                const collectionName = tipo === 'producto' ? 'categories' : 'services_categories';
                const snapshot = await getDocs(collection(db, collectionName));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    subcategorias: doc.data().subcategorias || []
                }));
                setCategoriasDb(categoriesData);
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar las categorías.' });
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
    }, [tipo]);

    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categoriasDb.find(cat => cat.adress === selectedAdress);
        setCategory(selectedAdress);
        setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
        setSubcat('');
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category) {
             Swal.fire('Campo Requerido', 'Por favor, selecciona una categoría.', 'warning');
             return;
        }
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'productos_presenciales'), {
                tipo,
                name: name.trim(),
                description: description.trim(),
                price: parseFloat(price),
                category,
                subcat
            });
            Swal.fire({
                icon: 'success', title: 'Item Creado',
                text: `"${name}" ha sido agregado exitosamente.`,
                timer: 2000, showConfirmButton: false
            });
            navigate('/admin/presential');
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error al Crear', text: 'No se pudo crear el item.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="presential-form-container">
            <h2>Agregar Nuevo Item Presencial</h2>
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
                    {isSubmitting ? 'Creando...' : 'Crear Item'}
                </button>
            </form>
        </div>
    );
};

export default AddPresential;
