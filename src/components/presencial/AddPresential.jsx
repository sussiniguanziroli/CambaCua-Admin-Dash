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
    const [categoryName, setCategoryName] = useState('');
    const [subcat, setSubcat] = useState('');
    const [isDoseable, setIsDoseable] = useState(false);
    const [pricePerML, setPricePerML] = useState('');

    const [categoriasDb, setCategoriasDb] = useState([]);
    const [subcategoriasDb, setSubcategoriasDb] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ... (All logic is unchanged) ...
    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            try {
                const collectionName = tipo === 'producto' ? 'categories' : 'services_categories';
                const snapshot = await getDocs(collection(db, collectionName));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress, nombre: doc.data().nombre, subcategorias: doc.data().subcategorias || []
                }));
                setCategoriasDb(categoriesData);
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar las categorías.' });
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
        setCategory(''); setCategoryName(''); setSubcat(''); setSubcategoriasDb([]);
    }, [tipo]);

    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categoriasDb.find(cat => cat.adress === selectedAdress);
        setCategory(selectedAdress);
        setCategoryName(selectedCat ? selectedCat.nombre : '');
        setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
        setSubcat('');
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category) { Swal.fire('Campo Requerido', 'Por favor, selecciona una categoría.', 'warning'); return; }
        if (isDoseable && (!pricePerML || parseFloat(pricePerML) <= 0)) { Swal.fire('Campo Requerido', 'Por favor, ingrese un precio por ML válido.', 'warning'); return; }
        
        setIsSubmitting(true);
        try {
            const dataToSave = {
                tipo, name: name.trim(), description: description.trim(),
                price: parseFloat(price), category, categoryName, subcat,
                isDoseable, pricePerML: isDoseable ? parseFloat(pricePerML) : null,
            };
            await addDoc(collection(db, 'productos_presenciales'), dataToSave);
            Swal.fire({ icon: 'success', title: 'Item Creado', text: `"${name}" ha sido agregado exitosamente.`, timer: 2000, showConfirmButton: false });
            navigate('/admin/presential-list');
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error al Crear', text: 'No se pudo crear el item.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- JSX with NEW class names ---
    return (
        <div className="item-form-container">
            <form onSubmit={handleSubmit} className="item-form">
                <h2>Agregar Nuevo Item Presencial</h2>

                <div className="item-form__group">
                    <label>Tipo de Item</label>
                    <div className="item-form__radio-group">
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

                <div className="item-form__group">
                    <label htmlFor="name">Nombre</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="item-form__group">
                    <label htmlFor="description">Descripción</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="item-form__group">
                    <label htmlFor="price">Precio (Contenedor Entero)</label>
                    <input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" />
                </div>

                 <div className="item-form__row">
                    <div className="item-form__group">
                        <label htmlFor="category">Categoría</label>
                        <select id="category" value={category} onChange={handleCategoriaChange} required disabled={isCatLoading}>
                            <option value="">{isCatLoading ? 'Cargando...' : 'Seleccionar Categoría'}</option>
                            {categoriasDb.map(cat => <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>)}
                        </select>
                    </div>
                    {subcategoriasDb.length > 0 && (
                        <div className="item-form__group">
                            <label htmlFor="subcat">Subcategoría</label>
                            <select id="subcat" value={subcat} onChange={(e) => setSubcat(e.target.value)}>
                                <option value="">Opcional</option>
                                {subcategoriasDb.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="item-form__group item-form__group--doseable">
                    <div className="item-form__checkbox-group">
                        <input id="isDoseable" type="checkbox" checked={isDoseable} onChange={(e) => setIsDoseable(e.target.checked)} />
                        <label htmlFor="isDoseable">Producto Dosificable (ej: inyectables)</label>
                    </div>
                    {isDoseable && (
                        <div className="item-form__group item-form__group--nested">
                            <label htmlFor="pricePerML">Precio por ML</label>
                            <input id="pricePerML" type="number" value={pricePerML} onChange={(e) => setPricePerML(e.target.value)} required min="0" step="0.01" placeholder="Ingrese el precio por mililitro"/>
                        </div>
                    )}
                </div>

                <button type="submit" className="item-form__submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Creando...' : 'Crear Item'}
                </button>
            </form>
        </div>
    );
};

export default AddPresential;