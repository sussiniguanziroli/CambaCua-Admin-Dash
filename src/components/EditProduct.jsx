import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';

const EditProduct = () => {
    const { id } = useParams(); // Obtener el ID del producto desde los parámetros de la URL
    const navigate = useNavigate(); // Hook para redirigir después de editar
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
                    id: doc.id,
                    ...doc.data()
                }));
                setCategorias(categoriesData);

                // Llamar a fetchProduct después de obtener las categorías
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
                    setCategoria(data.categoria);
                    setSubcategoria(data.subcategoria);
                    setPrecio(data.precio);
                    setStock(data.stock);
                    setDescripcion(data.descripcion);
                    setImagen(data.imagen);

                    // Establecer subcategorías basadas en la categoría del producto
                    const selectedCategoria = categoriesData.find(cat => cat.nombre === data.categoria);
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
        const selectedCategoria = categorias.find(cat => cat.id === e.target.value);
        setCategoria(selectedCategoria ? selectedCategoria.nombre : ''); // Guardar el nombre de la categoría
        setSubcategorias(selectedCategoria ? selectedCategoria.subcategorias : []);
        setSubcategoria(''); // Resetear subcategoría cuando cambia la categoría
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!producto) return;

        try {
            const productRef = doc(db, 'productos', id);
            await updateDoc(productRef, {
                nombre,
                categoria, // Aquí se guarda el nombre de la categoría en lugar del ID
                subcategoria,
                precio: parseFloat(precio),
                stock: parseInt(stock),
                descripcion,
                imagen
            });
            alert('Producto actualizado exitosamente');
            navigate('/admin/products'); // Redirigir a la lista de productos después de la actualización
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
                    
                    <select value={categoria} onChange={handleCategoriaChange} required>
                        <option value="" disabled>Seleccionar Categoría</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>

                    {subcategorias.length > 0 && (
                        <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required>
                            <option value="" disabled>Seleccionar Subcategoría</option>
                            {subcategorias.map(subcat => (
                                <option key={subcat} value={subcat}>{subcat}</option>
                            ))}
                        </select>
                    )}

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
                <p>Cargando...</p>
            )}
        </div>
    );
};

export default EditProduct;
