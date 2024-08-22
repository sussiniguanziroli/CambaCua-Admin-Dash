import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const AddProduct = () => {
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            const snapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategorias(categoriesData);
        };

        fetchCategories();
    }, []);

    const handleCategoriaChange = (e) => {
        const selectedCategoria = categorias.find(cat => cat.nombre === e.target.value);
        setCategoria(e.target.value);
        setSubcategorias(selectedCategoria ? selectedCategoria.subcategorias : []);
        setSubcategoria(''); // Reset subcategoria when categoria changes
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'productos'), {
                nombre,
                categoria,
                subcategoria,
                precio: parseFloat(precio),
                stock: parseInt(stock),
                descripcion,
                imagen,
                activo: true,
                fecha_agregado: new Date()
            });
            alert('Producto agregado exitosamente');
            setNombre('');
            setCategoria('');
            setSubcategoria('');
            setPrecio('');
            setStock('');
            setDescripcion('');
            setImagen('');
        } catch (error) {
            console.error("Error al agregar el producto: ", error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" required />
            
            <select value={categoria} onChange={handleCategoriaChange} required>
                <option value="">Seleccionar Categoría</option>
                {categorias.map((cat) => (
                    <option key={cat.nombre} value={cat.nombre}>{cat.nombre}</option>
                ))}
            </select>

            {subcategorias.length > 0 && (
                <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required>
                    <option value="">Seleccionar Subcategoría</option>
                    {subcategorias.map((subcat, index) => (
                        <option key={index} value={subcat}>{subcat}</option>
                    ))}
                </select>
            )}

            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio" required />
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock disponible" required />
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" required></textarea>
            <input type="text" value={imagen} onChange={(e) => setImagen(e.target.value)} placeholder="URL de la imagen" required />
            <button type="submit">Agregar Producto</button>
        </form>
    );
};

export default AddProduct;
