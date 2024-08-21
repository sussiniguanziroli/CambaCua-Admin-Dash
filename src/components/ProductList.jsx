import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';


const ProductList = () => {
    const [productos, setProductos] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const snapshot = await getDocs(collection(db, 'productos'));
            const productosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProductos(productosData);
        };

        fetchProducts();
    }, []);

    const toggleProductActive = async (producto) => {
        const productRef = doc(db, 'productos', producto.id);
        await updateDoc(productRef, {
            activo: !producto.activo
        });
        setProductos(productos.map(p => 
            p.id === producto.id ? { ...p, activo: !p.activo } : p
        ));
    };

    return (
        <div>
            <h2>Lista de Productos</h2>
            <ul>
                {productos.map((producto) => (
                    <li key={producto.id}>
                        <Link to={`/admin/edit-product/${producto.id}`}>{producto.nombre}</Link>
                        ({producto.activo ? 'Activo' : 'Inactivo'})
                        <button onClick={() => toggleProductActive(producto)}>
                            {producto.activo ? 'Desactivar' : 'Activar'}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;
