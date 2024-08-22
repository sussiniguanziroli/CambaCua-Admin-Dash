import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Filtrado from './Filtrado';

const ProductList = () => {
    const [productos, setProductos] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);

    // Fetch products from Firestore
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'productos'));
                const productosData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setProductos(productosData);
                setFilteredProducts(productosData);
            } catch (error) {
                console.error('Error al obtener los productos: ', error);
            }
        };

        fetchProducts();
    }, []);

    // Toggle product active status
    const toggleProductActive = async (producto) => {
        const productRef = doc(db, 'productos', producto.id);
        await updateDoc(productRef, {
            activo: !producto.activo
        });
        setProductos(productos.map(p => 
            p.id === producto.id ? { ...p, activo: !p.activo } : p
        ));
        setFilteredProducts(filteredProducts.map(p => 
            p.id === producto.id ? { ...p, activo: !p.activo } : p
        ));
    };

    // Delete product
    const deleteProduct = async (producto) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el producto "${producto.nombre}"?`)) {
            try {
                const productRef = doc(db, 'productos', producto.id);
                await deleteDoc(productRef);
                setProductos(productos.filter(p => p.id !== producto.id));
                setFilteredProducts(filteredProducts.filter(p => p.id !== producto.id));
                alert('Producto eliminado correctamente');
            } catch (error) {
                console.error('Error al eliminar el producto:', error);
            }
        }
    };

    // Handle filtering based on category, subcategory, and text
    const handleFilter = ({ category, subcategory, text }) => {
        let filtered = productos;

        if (category) {
            filtered = filtered.filter(producto => producto.categoria === category);
        }

        if (subcategory) {
            filtered = filtered.filter(producto => producto.subcategoria === subcategory);
        }

        if (text) {
            filtered = filtered.filter(producto =>
                producto.nombre.toLowerCase().includes(text.toLowerCase()) ||
                producto.categoria.toLowerCase().includes(text.toLowerCase()) ||
                producto.subcategoria.toLowerCase().includes(text.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    };

    return (
        <div>
            <Filtrado onFilter={handleFilter} />
            <div className="product-list">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map(producto => (
                        <div key={producto.id} className="product-item">
                            <h3>{producto.nombre}</h3>
                            <p>{producto.descripcion}</p>
                            <p>Precio: ${producto.precio}</p>
                            <p>Stock: {producto.stock}</p>
                            <p>Categoría: {producto.categoria}</p>
                            <p>Subcategoría: {producto.subcategoria}</p>
                            <button onClick={() => toggleProductActive(producto)}>
                                {producto.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button onClick={() => deleteProduct(producto)}>Eliminar</button>
                            <Link to={`/admin/edit-product/${producto.id}`}>Editar</Link>
                        </div>
                    ))
                ) : (
                    <p>No se encontraron productos.</p>
                )}
            </div>
        </div>
    );
};

export default ProductList;
