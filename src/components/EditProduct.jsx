import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';

const EditProduct = () => {
    const { id } = useParams(); // Obtén el ID del parámetro de la URL
    const [producto, setProducto] = useState(null);
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            if (id) {
                const productRef = doc(db, 'productos', id);
                const productSnapshot = await getDocs(productRef);
                if (productSnapshot.exists()) {
                    const data = productSnapshot.data();
                    setProducto(data);
                    setNombre(data.nombre);
                    setCategoria(data.categoria);
                    setPrecio(data.precio);
                    setStock(data.stock);
                    setDescripcion(data.descripcion);
                    setImagen(data.imagen);
                }
            }
        };

        fetchProduct();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!id) return;

        try {
            const productRef = doc(db, 'productos', id);
            await updateDoc(productRef, {
                nombre,
                categoria,
                precio: parseFloat(precio) || 0, // Asegúrate de que el precio sea un número
                stock: parseInt(stock) || 0, // Asegúrate de que el stock sea un número
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
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del producto"
                        required
                    />
                    <input
                        type="text"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        placeholder="Categoría"
                        required
                    />
                    <input
                        type="number"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        placeholder="Precio"
                        required
                    />
                    <input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="Stock disponible"
                        required
                    />
                    <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Descripción"
                        required
                    ></textarea>
                    <input
                        type="text"
                        value={imagen}
                        onChange={(e) => setImagen(e.target.value)}
                        placeholder="URL de la imagen"
                        required
                    />
                    <button type="submit">Actualizar Producto</button>
                </form>
            ) : (
                <p>Selecciona un producto para editar.</p>
            )}
        </div>
    );
};

export default EditProduct;
