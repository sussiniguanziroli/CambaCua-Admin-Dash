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
    const [categoryName, setCategoryName] = useState('');
    const [subcat, setSubcat] = useState('');
    const [isDoseable, setIsDoseable] = useState(false);
    const [pricePerML, setPricePerML] = useState('');
    
    const [categoriasDb, setCategoriasDb] = useState([]);
    const [subcategoriasDb, setSubcategoriasDb] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCategories = useCallback(async (tipoParam) => {
        setIsCatLoading(true);
        try {
            const collectionName = tipoParam === 'producto' ? 'categories' : 'services_categories';
            const snapshot = await getDocs(collection(db, collectionName));
            const categoriesData = snapshot.docs.map(doc => ({ adress: doc.data().adress, nombre: doc.data().nombre, subcategorias: doc.data().subcategorias || [] }));
            setCategoriasDb(categoriesData);
            return categoriesData;
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar las categorías.' });
            return [];
        } finally {
            setIsCatLoading(false);
        }
    }, []);

    const fetchItemData = useCallback(async () => {
        setIsDataLoading(true);
        try {
            const itemRef = doc(db, 'productos_presenciales', id);
            const itemSnap = await getDoc(itemRef);

            if (itemSnap.exists()) {
                const data = itemSnap.data();
                setTipo(data.tipo); setName(data.name); setDescription(data.description);
                setPrice(data.price.toString()); setCategory(data.category); setCategoryName(data.categoryName || '');
                setSubcat(data.subcat || ''); setIsDoseable(data.isDoseable || false); setPricePerML(data.pricePerML ? data.pricePerML.toString() : '');
                
                const categories = await fetchCategories(data.tipo);
                const selectedCat = categories.find(cat => cat.adress === data.category);
                if (selectedCat) { setSubcategoriasDb(selectedCat.subcategorias); }
            } else {
                Swal.fire("Error", "Item no encontrado.", "error");
                navigate('/admin/presential-list');
            }
        } catch (error) {
            Swal.fire("Error", "No se pudieron cargar los datos del item.", "error");
        } finally {
            setIsDataLoading(false);
        }
    }, [id, navigate, fetchCategories]);

    useEffect(() => { fetchItemData(); }, [fetchItemData]);
    
    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categoriasDb.find(cat => cat.adress === selectedAdress);
        setCategory(selectedAdress); setCategoryName(selectedCat ? selectedCat.nombre : '');
        setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
        setSubcat('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isDoseable && (!pricePerML || parseFloat(pricePerML) <= 0)) { Swal.fire('Campo Requerido', 'Por favor, ingrese un precio por ML válido.', 'warning'); return; }
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'productos_presenciales', id), {
                tipo, name: name.trim(), description: description.trim(),
                price: parseFloat(price), category, categoryName, subcat,
                isDoseable, pricePerML: isDoseable ? parseFloat(pricePerML) : null,
            });
            Swal.fire({ title: "Item Actualizado", icon: "success" });
            navigate('/admin/presential-list');
        } catch (error) {
            Swal.fire("Error", "Hubo un problema al actualizar el item.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isDataLoading) { return <p className="loading-message">Cargando datos del item...</p>; }

    return (
        <div className="presential-form-container">
            <h2>Editar Item Presencial</h2>
            <form onSubmit={handleSubmit} className="presential-form">
                <div className="form-group"><label>Tipo de Item</label><div className="radio-group"><label><input type="radio" value="producto" checked={tipo === 'producto'} onChange={(e) => setTipo(e.target.value)} /> Producto</label><label><input type="radio" value="servicio" checked={tipo === 'servicio'} onChange={(e) => setTipo(e.target.value)} /> Servicio</label></div></div>
                <div className="form-group"><label htmlFor="name">Nombre</label><input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="description">Descripción</label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="price">Precio (Contenedor Entero)</label><input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" /></div>
                <div className="form-row"><div className="form-group"><label htmlFor="category">Categoría</label><select id="category" value={category} onChange={handleCategoriaChange} required disabled={isCatLoading}><option value="">{isCatLoading ? 'Cargando...' : 'Seleccionar Categoría'}</option>{categoriasDb.map(cat => <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>)}</select></div>{subcategoriasDb.length > 0 && (<div className="form-group"><label htmlFor="subcat">Subcategoría</label><select id="subcat" value={subcat} onChange={(e) => setSubcat(e.target.value)}><option value="">Opcional</option>{subcategoriasDb.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select></div>)}</div>
                <div className="form-group doseable-section"><div className="checkbox-group"><input id="isDoseable" type="checkbox" checked={isDoseable} onChange={(e) => setIsDoseable(e.target.checked)} /><label htmlFor="isDoseable">Producto Dosificable (ej: inyectables)</label></div>{isDoseable && (<div className="form-group"><label htmlFor="pricePerML">Precio por ML</label><input id="pricePerML" type="number" value={pricePerML} onChange={(e) => setPricePerML(e.target.value)} required min="0" step="0.01" placeholder="Ingrese el precio por mililitro"/></div>)}</div>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>{isSubmitting ? 'Actualizando...' : 'Actualizar Item'}</button>
            </form>
        </div>
    );
};

export default EditPresential;