import React, { useState } from 'react';
import { db } from '../firebase/config.js';
import { collection, addDoc } from 'firebase/firestore';

const AddProduct = () => {
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'productos'), {
                nombre,
                categoria,
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
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Categoría" required />
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio" required />
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock disponible" required />
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" required></textarea>
            <input type="text" value={imagen} onChange={(e) => setImagen(e.target.value)} placeholder="URL de la imagen" required />
            <button type="submit">Agregar Producto</button>
        </form>
    );
};

export default AddProduct;
