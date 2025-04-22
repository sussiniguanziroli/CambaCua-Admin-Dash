import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoaderSpinner from './utils/LoaderSpinner'; // *** IMPORTAR LOADER ***

const AddProduct = () => {
    const navigate = useNavigate();

    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
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
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [catError, setCatError] = useState(null); // Puede mostrar error de carga o de submit
    const [isSubmitting, setIsSubmitting] = useState(false); // Envío de formulario

    // Cargar Categorías
    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            setCatError(null);
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias || []
                }));
                setCategorias(categoriesData);
            } catch (error) {
                console.error('Error al obtener las categorías: ', error);
                setCatError('Error al cargar categorías.');
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Carga',
                    text: 'No se pudieron cargar las categorías necesarias.',
                });
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
    }, []);

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
        setCatError(null);

        const selectedCat = categorias.find(cat => cat.adress === categoria);
        if (!selectedCat) {
             Swal.fire('Error', 'Debes seleccionar una categoría válida.', 'error');
             setIsSubmitting(false);
             return;
        }
        if (subcategorias.length > 0 && !subcategoria) {
            Swal.fire('Campo Requerido', 'Por favor, selecciona una subcategoría.', 'warning');
            setIsSubmitting(false);
            return;
        }

        try {
            // Agregar producto a Firestore
            await addDoc(collection(db, 'productos'), {
                activo: true,
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
                title: 'Producto Creado',
                text: `"${nombre}" ha sido agregado exitosamente.`,
                timer: 2000,
                showConfirmButton: false
            });
            navigate('/admin/products');

        } catch (error) {
            console.error('Error al crear el producto: ', error);
            setCatError("Ocurrió un error al crear el producto.");
            Swal.fire({
                icon: 'error',
                title: 'Error al Crear',
                text: 'No se pudo crear el producto. Inténtalo de nuevo.',
            });
        } finally {
            setIsSubmitting(false); // Finaliza submit
        }
    };

    // --- Renderizado ---
    return (
        <div className="product-form-container">
             <h2>Agregar Nuevo Producto</h2>
            {/* Mostramos error de submit si existe */}
            {catError && <p className="error-message" style={{textAlign: 'center', marginBottom: '1rem'}}>{catError}</p>}

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
                        disabled={isSubmitting || isCatLoading} // Deshabilitado si carga categorías o envía
                    >
                        <option value="" disabled>{isCatLoading ? 'Cargando Cat...' : 'Seleccionar Categoría'}</option>
                        {categorias.map(cat => (
                            <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>
                        ))}
                    </select>
                     {/* Mostrar error de carga de categorías aquí */}
                     {catError && !isCatLoading && categoria === '' && <p className="error-message-inline">{catError}</p>}
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
                        placeholder="https://ejemplo.com/imagen-portada.jpg"
                        disabled={isSubmitting}
                    />
                     <small>Esta imagen se usará como portada en la lista de productos.</small>
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
                <button type="submit" className="btn-submit" disabled={isSubmitting || isCatLoading}>
                    {isSubmitting ? <LoaderSpinner size="small" /> : 'Crear Producto'}
                </button>
            </form>
        </div>
    );
};

export default AddProduct;