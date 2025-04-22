import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoaderSpinner from '../components/utils/LoaderSpinner'; // *** IMPORTAR LOADER ***

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState(''); // Almacena categoryAdress
    const [subcategoria, setSubcategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagen, setImagen] = useState('');
    const [imagenB, setImagenB] = useState('');
    const [imagenC, setImagenC] = useState('');

    // Estados de carga y datos auxiliares
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Carga inicial
    const [isSubmitting, setIsSubmitting] = useState(false); // Envío de formulario
    const [error, setError] = useState(null);
    const [productNotFound, setProductNotFound] = useState(false);

    // Cargar Categorías y Producto
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            setProductNotFound(false);
            let fetchedCategories = [];

            try {
                // 1. Cargar Categorías
                const catSnapshot = await getDocs(collection(db, 'categories'));
                fetchedCategories = catSnapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias || []
                }));
                setCategorias(fetchedCategories);

                // 2. Cargar Producto
                const productRef = doc(db, 'productos', id);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const data = productSnap.data();
                    // Setear estado del formulario
                    setNombre(data.nombre || '');
                    setCategoria(data.categoryAdress || '');
                    setSubcategoria(data.subcategoria || '');
                    setPrecio(data.precio !== undefined ? data.precio.toString() : '');
                    setStock(data.stock !== undefined ? data.stock.toString() : '');
                    setDescripcion(data.descripcion || '');
                    setImagen(data.imagen || '');
                    setImagenB(data.imagenB || '');
                    setImagenC(data.imagenC || '');

                    // Setear subcategorías iniciales
                    const initialCategoria = fetchedCategories.find(cat => cat.adress === data.categoryAdress);
                    setSubcategorias(initialCategoria ? initialCategoria.subcategorias : []);
                } else {
                    setProductNotFound(true);
                    setError(`No se encontró ningún producto con el ID: ${id}`);
                }
            } catch (err) {
                console.error("Error al cargar datos: ", err);
                setError("Error al cargar los datos para editar el producto.");
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Carga',
                    text: 'No se pudieron cargar los datos necesarios.',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Manejar cambio de categoría
    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categorias.find(cat => cat.adress === selectedAdress);
        setCategoria(selectedAdress);
        setSubcategorias(selectedCat ? selectedCat.subcategorias : []);
        setSubcategoria(''); // Resetear subcategoría
    };

    // Manejar envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true); // Inicia submit
        setError(null);

        const selectedCat = categorias.find(cat => cat.adress === categoria);
        if (!selectedCat) {
             Swal.fire('Error', 'Categoría seleccionada no es válida.', 'error');
             setIsSubmitting(false);
             return;
        }
        if (subcategorias.length > 0 && !subcategoria) {
            Swal.fire('Campo Requerido', 'Por favor, selecciona una subcategoría.', 'warning');
            setIsSubmitting(false);
            return;
        }

        try {
            const productRef = doc(db, 'productos', id);
            await updateDoc(productRef, {
                nombre: nombre.trim(),
                categoria: selectedCat.nombre,
                categoryAdress: categoria,
                subcategoria: subcategoria,
                precio: parseFloat(precio) || 0,
                stock: parseInt(stock) || 0,
                descripcion: descripcion.trim(),
                imagen: imagen.trim(),
                imagenB: imagenB.trim(),
                imagenC: imagenC.trim(),
            });

            Swal.fire({
                icon: 'success',
                title: 'Producto Actualizado',
                text: `"${nombre}" ha sido actualizado correctamente.`,
                timer: 2000,
                showConfirmButton: false
            });
            navigate('/admin/products');

        } catch (err) {
            console.error("Error al actualizar el producto: ", err);
            setError("Ocurrió un error al guardar los cambios.");
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar',
                text: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
            });
        } finally {
            setIsSubmitting(false); // Finaliza submit
        }
    };

    // --- Renderizado ---
    if (isLoading) {
        // *** USAR LOADER PARA CARGA INICIAL DEL FORMULARIO ***
        return (
             <div className="loader-container" style={{ minHeight: '60vh' }}>
                <LoaderSpinner size="large" />
            </div>
        );
    }

    if (productNotFound) {
        return <p className="error-message">{error || 'Producto no encontrado.'}</p>;
    }

    if (error && !productNotFound) {
         return <p className="error-message">{error}</p>;
    }

    return (
        <div className="product-form-container">
            <h2>Editar Producto</h2>
            {/* Mostrar error de submit si existe */}
            {error && !isLoading && !productNotFound && <p className="error-message" style={{textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}

            <form onSubmit={handleSubmit} className="product-form">
                {/* Nombre */}
                <div className="form-group">
                    <label htmlFor="nombre">Nombre</label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del producto"
                        required
                        disabled={isSubmitting}
                    />
                </div>

                {/* Categoría */}
                <div className="form-group">
                    <label htmlFor="categoria">Categoría</label>
                    <select
                        id="categoria"
                        value={categoria}
                        onChange={handleCategoriaChange}
                        required
                        disabled={isSubmitting} // Deshabilitado solo durante submit
                    >
                        <option value="" disabled>Seleccionar Categoría</option>
                        {categorias.map(cat => (
                            <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Subcategoría (Condicional) */}
                {subcategorias.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="subcategoria">Subcategoría</label>
                        <select
                            id="subcategoria"
                            value={subcategoria}
                            onChange={(e) => setSubcategoria(e.target.value)}
                            required
                            disabled={isSubmitting || !categoria}
                        >
                            <option value="" disabled>Seleccionar Subcategoría</option>
                            {subcategorias.map(subcat => (
                                <option key={subcat} value={subcat}>{subcat}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Precio y Stock */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="precio">Precio ($)</label>
                        <input
                            id="precio"
                            type="number"
                            step="0.01"
                            min="0"
                            value={precio}
                            onChange={(e) => setPrecio(e.target.value)}
                            placeholder="0.00"
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="stock">Stock</label>
                        <input
                            id="stock"
                            type="number"
                            step="1"
                            min="0"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="0"
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Descripción */}
                <div className="form-group">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Detalles del producto"
                        rows="4"
                        required
                        disabled={isSubmitting}
                    />
                </div>

                {/* Imagen Principal */}
                <div className="form-group">
                    <label htmlFor="imagen">Imagen Principal (URL)</label>
                    <input
                        id="imagen"
                        type="url"
                        value={imagen}
                        onChange={(e) => setImagen(e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Imágenes Secundarias */}
                 <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="imagenB">Imagen B (URL)</label>
                        <input
                            id="imagenB"
                            type="url"
                            value={imagenB}
                            onChange={(e) => setImagenB(e.target.value)}
                            placeholder="URL Imagen Opcional"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="imagenC">Imagen C (URL)</label>
                        <input
                            id="imagenC"
                            type="url"
                            value={imagenC}
                            onChange={(e) => setImagenC(e.target.value)}
                            placeholder="URL Imagen Opcional"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Botón de Envío con Loader */}
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? <LoaderSpinner size="small" /> : 'Actualizar Producto'}
                </button>
            </form>
        </div>
    );
};

export default EditProduct;