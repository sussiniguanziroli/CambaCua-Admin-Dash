import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AddProduct = () => {
    const navigate = useNavigate();
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
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias
                }));
                setCategorias(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
            }
        };

        fetchCategories();
    }, []);

    const handleCategoriaChange = (e) => {
        const selectedCategoria = categorias.find(cat => cat.adress === e.target.value);
        setCategoria(e.target.value);
        setSubcategorias(selectedCategoria ? selectedCategoria.subcategorias : []);
        setSubcategoria(''); // Resetear subcategoría cuando cambia la categoría
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Obtener el objeto de la categoría seleccionada
            const selectedCategoria = categorias.find(cat => cat.adress === categoria);

            if (!selectedCategoria) {
                alert('Categoría no válida');
                return;
            }

            // Agregar producto a Firestore
            await addDoc(collection(db, 'productos'), {
                activo: true,
                nombre,
                categoria: selectedCategoria.nombre, // Guardar el nombre de la categoría
                subcategoria,
                precio: parseFloat(precio),
                stock: parseInt(stock),
                descripcion,
                imagen,
                categoryAdress: selectedCategoria.adress // Guardar solo la dirección de la categoría
            });

            alert('Producto creado exitosamente');
            navigate('/admin/products'); // Redirigir a la lista de productos después de crear el producto
        } catch (error) {
            console.error('Error al crear el producto: ', error);
        }
    };

    return (
        <div className="add-product-container">
            <h2>Agregar Producto</h2>
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
                    ></textarea>
                </label>

                <label>
                    Imagen (URL):
                    <input
                        type="text"
                        value={imagen}
                        onChange={(e) => setImagen(e.target.value)}
                        placeholder="URL de la imagen"
                    />
                </label>

                <button type="submit">Crear Producto</button>
            </form>
        </div>
    );
};

export default AddProduct;
