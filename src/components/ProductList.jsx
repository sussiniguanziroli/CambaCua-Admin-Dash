import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Filtrado from './Filtrado';

const ProductList = () => {
    const [productos, setProductos] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);

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

    const handleFilter = ({ category, subcategory, text }) => {
        let filtered = productos;

        if (category) {
            filtered = filtered.filter(producto => producto.categoryAdress === category);
        }

        if (subcategory) {
            filtered = filtered.filter(producto => producto.subcategoria === subcategory);
        }

        if (text) {
            filtered = filtered.filter(producto =>
                producto.nombre.toLowerCase().includes(text.toLowerCase()) ||
                producto.categoryAdress.toLowerCase().includes(text.toLowerCase()) ||
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
                            <div>
                            <img src={producto.imagen} alt={producto.nombre} />
                            </div>
                            <p>Precio: ${producto.precio}</p>
                            <p>Stock: {producto.stock}</p>
                            <p>Descripcion:{producto.descripcion}</p>
                            <p>Subcategoría: {producto.subcategoria}</p><p>Categoría: {producto.categoria}</p>
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
