import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';


const EditProduct = () => {
    const { id } = useParams(); // Obtén el ID del producto desde los parámetros de la URL
    const [producto, setProducto] = useState(null);
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const productRef = doc(db, 'productos', id);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const data = productSnap.data();
                    setProducto(data);
                    setNombre(data.nombre);
                    setCategoria(data.categoria);
                    setPrecio(data.precio);
                    setStock(data.stock);
                    setDescripcion(data.descripcion);
                    setImagen(data.imagen);
                } else {
                    console.log('No se encontró el producto');
                }
            } catch (error) {
                console.error('Error al obtener el producto: ', error);
            }
        };

        fetchProduct();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!producto) return;

        try {
            const productRef = doc(db, 'productos', id);
            await updateDoc(productRef, {
                nombre,
                categoria,
                precio: parseFloat(precio),
                stock: parseInt(stock),
                descripcion,
                imagen
            });
            alert('Producto actualizado exitosamente');
        } catch (error) {
            console.error("Error al actualizar el producto: ", error);
        }
    };

    return (
        <div>
            <h2>Editar Producto</h2>
            {producto ? (
                <form onSubmit={handleSubmit}>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" required />
                    <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Categoría" required />
                    <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Precio" required />
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock disponible" required />
                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" required></textarea>
                    <input type="text" value={imagen} onChange={(e) => setImagen(e.target.value)} placeholder="URL de la imagen" required />
                    <button type="submit">Actualizar Producto</button>
                </form>
            ) : (
                <p>Cargando...</p>
            )}
        </div>
    );
};

export default EditProduct;
