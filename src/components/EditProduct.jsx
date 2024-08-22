import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [producto, setProducto] = useState(null);
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias
                }));
                setCategorias(categoriesData);

                fetchProduct(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
            }
        };

        const fetchProduct = async (categoriesData) => {
            try {
                const productRef = doc(db, 'productos', id);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const data = productSnap.data();
                    setProducto(data);
                    setNombre(data.nombre);
                    setCategoria(data.categoryAdress); // Utilizar categoryAdress para la categoría
                    setSubcategoria(data.subcategoria);
                    setPrecio(data.precio);
                    setStock(data.stock);
                    setDescripcion(data.descripcion);
                    setImagen(data.imagen);

                    const selectedCategoria = categoriesData.find(cat => cat.adress === data.categoryAdress);
                    setSubcategorias(selectedCategoria ? selectedCategoria.subcategorias : []);
                } else {
                    console.log('No se encontró el producto');
                }
            } catch (error) {
                console.error('Error al obtener el producto: ', error);
            }
        };

        fetchCategories();
    }, [id]);

    const handleCategoriaChange = (e) => {
        const selectedCategoria = categorias.find(cat => cat.adress === e.target.value);
        setCategoria(e.target.value);
        setSubcategorias(selectedCategoria ? selectedCategoria.subcategorias : []);
        setSubcategoria('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!producto) return;

        try {
            const productRef = doc(db, 'productos', id);
            await updateDoc(productRef, {
                nombre,
                categoria: categorias.find(cat => cat.adress === categoria)?.nombre || producto.categoria,
                subcategoria,
                precio: parseFloat(precio),
                stock: parseInt(stock),
                descripcion,
                imagen,
                categoryAdress: categoria // Actualizar categoryAdress en lugar de añadir un nuevo campo
            });
            alert('Producto actualizado exitosamente');
            navigate('/admin/products');
        } catch (error) {
            console.error("Error al actualizar el producto: ", error);
        }
    };

    return (
        <div className="edit-product-container">
            <h2>Editar Producto</h2>
            {producto ? (
                <form onSubmit={handleSubmit}>
                    <label>
                        Nombre:
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Nombre del producto"
                            required
                        />
                    </label>
                    
                    <label>
                        Categoría:
                        <select value={categoria} onChange={handleCategoriaChange} required>
                            <option value="" disabled>Seleccionar Categoría</option>
                            {categorias.map(cat => (
                                <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>
                            ))}
                        </select>
                    </label>

                    {subcategorias.length > 0 && (
                        <label>
                            Subcategoría:
                            <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required>
                                <option value="" disabled>Seleccionar Subcategoría</option>
                                {subcategorias.map(subcat => (
                                    <option key={subcat} value={subcat}>{subcat}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label>
                        Precio:
                        <input
                            type="number"
                            step="0.01"
                            value={precio}
                            onChange={(e) => setPrecio(e.target.value)}
                            placeholder="Precio"
                            required
                        />
                    </label>
                    
                    <label>
                        Stock:
                        <input
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="Stock disponible"
                            required
                        />
                    </label>
                    
                    <label>
                        Descripción:
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción"
                            required
                        />
                    </label>
                    
                    <label>
                        Imagen (URL):
                        <input
                            type="text"
                            value={imagen}
                            onChange={(e) => setImagen(e.target.value)}
                            placeholder="URL de la imagen"
                            required
                        />
                    </label>
                    
                    <button type="submit">Actualizar Producto</button>
                </form>
            ) : (
                <p>Cargando...</p>
            )}
        </div>
    );
};

export default EditProduct;
