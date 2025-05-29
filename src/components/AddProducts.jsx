import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoaderSpinner from './utils/LoaderSpinner';

const AddProduct = () => {
    const navigate = useNavigate();

    // Estados del formulario (sin cambios)
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');

    const [imagenUrl, setImagenUrl] = useState('');
    const [imagenFile, setImagenFile] = useState(null);
    const [imagenPreview, setImagenPreview] = useState('');
    const [isUploadingImagen, setIsUploadingImagen] = useState(false);

    const [imagenBUrl, setImagenBUrl] = useState('');
    const [imagenBFile, setImagenBFile] = useState(null);
    const [imagenBPreview, setImagenBPreview] = useState('');
    const [isUploadingImagenB, setIsUploadingImagenB] = useState(false);

    const [imagenCUrl, setImagenCUrl] = useState('');
    const [imagenCFile, setImagenCFile] = useState(null);
    const [imagenCPreview, setImagenCPreview] = useState('');
    const [isUploadingImagenC, setIsUploadingImagenC] = useState(false);

    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [formError, setFormError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar Categorías (sin cambios)
    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            setFormError(null);
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
                setFormError('Error al cargar categorías.');
                Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar las categorías necesarias.' });
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
    }, []);

    // Manejar cambio de categoría (sin cambios)
    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categorias.find(cat => cat.adress === selectedAdress);
        setCategoria(selectedAdress);
        setSubcategorias(selectedCat ? selectedCat.subcategorias : []);
        setSubcategoria('');
    };

    // Manejar cambio de archivo de imagen (sin cambios)
    const handleFileChange = (event, setFile, setPreview, setUrlState) => {
        const file = event.target.files[0];
        if (file) {
            setFile(file);
            setPreview(URL.createObjectURL(file));
            setUrlState('');
        } else {
            setFile(null);
            setPreview('');
        }
    };

    // Manejar cambio de URL manual de imagen (sin cambios)
    const handleUrlChange = (event, setUrlState, setFile, setPreview) => {
        const newUrl = event.target.value;
        setUrlState(newUrl);
        if (newUrl) {
            setFile(null);
            setPreview('');
        }
    };
    
    const uploadImageAndGetURL = async (file, currentUrl, setLoadingState, imageName, productId) => {
        if (!file) return currentUrl; 

        if (!productId) {
            console.error("Product ID is required to upload image.");
            Swal.fire('Error Interno', 'No se pudo obtener el ID del producto para subir la imagen.', 'error');
            throw new Error("Product ID missing for image upload.");
        }

        setLoadingState(true);
        const fileName = `productos/${productId}/${imageName}-${Date.now()}-${file.name}`;
        const storageRef = ref(storage, fileName);
        try {
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            setLoadingState(false);
            return downloadUrl;
        } catch (error) {
            console.error(`Error uploading ${imageName} for product ${productId}: `, error);
            setLoadingState(false);
            Swal.fire('Error de Subida', `No se pudo subir la imagen ${imageName}.`, 'error');
            throw error; 
        }
    };
    
    const resetForm = () => {
        setNombre(''); setCategoria(''); setSubcategoria('');
        setPrecio(''); setStock(''); setDescripcion('');
        setImagenUrl(''); setImagenFile(null); setImagenPreview('');
        setImagenBUrl(''); setImagenBFile(null); setImagenBPreview('');
        setImagenCUrl(''); setImagenCFile(null); setImagenCPreview('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        const selectedCat = categorias.find(cat => cat.adress === categoria);
        if (!selectedCat) {
            Swal.fire('Error', 'Debes seleccionar una categoría válida.', 'error');
            setIsSubmitting(false); return;
        }
        if (subcategorias.length > 0 && !subcategoria) {
            Swal.fire('Campo Requerido', 'Por favor, selecciona una subcategoría.', 'warning');
            setIsSubmitting(false); return;
        }
        if (!imagenUrl && !imagenFile) {
            Swal.fire('Campo Requerido', 'Por favor, proporciona una URL para la Imagen Principal o sube un archivo.', 'warning');
            setIsSubmitting(false); return;
        }

        let newDocRef; 

        try {
            const currentDate = new Date(); // Get current date for timestamps
            const productDataInitial = {
                activo: true,
                nombre: nombre.trim(),
                categoria: selectedCat.nombre,
                categoryAdress: categoria,
                subcategoria: subcategoria,
                precio: parseFloat(precio) || 0,
                stock: parseInt(stock) || 0,
                descripcion: descripcion.trim(),
                imagen: '', 
                imagenB: '', 
                imagenC: '', 
                createdAt: currentDate,
                updatedAt: currentDate, // Initially same as createdAt
                precioLastUpdated: currentDate, // Set on creation
                stockLastUpdated: currentDate,  // Set on creation
            };
            newDocRef = await addDoc(collection(db, 'productos'), productDataInitial);
            const newProductId = newDocRef.id;

            let finalImagenUrl = imagenUrl;
            let finalImagenBUrl = imagenBUrl;
            let finalImagenCUrl = imagenCUrl;

            finalImagenUrl = await uploadImageAndGetURL(imagenFile, imagenUrl, setIsUploadingImagen, "principal", newProductId);
            finalImagenBUrl = await uploadImageAndGetURL(imagenBFile, imagenBUrl, setIsUploadingImagenB, "secundaria_b", newProductId);
            finalImagenCUrl = await uploadImageAndGetURL(imagenCFile, imagenCUrl, setIsUploadingImagenC, "secundaria_c", newProductId);

            await updateDoc(doc(db, 'productos', newProductId), {
                imagen: finalImagenUrl || '',
                imagenB: finalImagenBUrl || '',
                imagenC: finalImagenCUrl || '',
                // No need to update timestamps here as they were set during creation with initial productData
            });

            Swal.fire({
                icon: 'success', title: 'Producto Creado',
                text: `"${nombre}" ha sido agregado exitosamente.`,
                timer: 2000, showConfirmButton: false
            });
            resetForm();
            navigate('/admin/products');

        } catch (error) {
            console.error('Error al crear el producto: ', error);
            if (newDocRef && !error.message.includes("No se pudo subir la imagen")) {
                console.warn("Product document might have been created but image URLs not updated.", newDocRef.id);
            }
            if (!error.message.includes("No se pudo subir la imagen")) {
                 setFormError("Ocurrió un error al crear el producto.");
                 Swal.fire({ icon: 'error', title: 'Error al Crear', text: 'No se pudo crear el producto. Inténtalo de nuevo.' });
            }
        } finally {
            setIsSubmitting(false);
            setIsUploadingImagen(false);
            setIsUploadingImagenB(false);
            setIsUploadingImagenC(false);
        }
    };

    // JSX (sin cambios)
    return (
        <div className="product-form-container">
            <h2>Agregar Nuevo Producto</h2>
            {formError && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{formError}</p>}
            <form onSubmit={handleSubmit} className="product-form">
                {/* Nombre */}
                <div className="form-group">
                    <label htmlFor="nombre">Nombre</label>
                    <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" required disabled={isSubmitting} />
                </div>

                {/* Categoría */}
                <div className="form-group">
                    <label htmlFor="categoria">Categoría</label>
                    <select id="categoria" value={categoria} onChange={handleCategoriaChange} required disabled={isSubmitting || isCatLoading}>
                        <option value="" disabled>{isCatLoading ? 'Cargando Cat...' : 'Seleccionar Categoría'}</option>
                        {categorias.map(cat => (<option key={cat.adress} value={cat.adress}>{cat.nombre}</option>))}
                    </select>
                </div>

                {/* Subcategoría */}
                {subcategorias.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="subcategoria">Subcategoría</label>
                        <select id="subcategoria" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required disabled={isSubmitting || !categoria}>
                            <option value="" disabled>Seleccionar Subcategoría</option>
                            {subcategorias.map(subcat => (<option key={subcat} value={subcat}>{subcat}</option>))}
                        </select>
                    </div>
                )}

                {/* Precio y Stock */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="precio">Precio ($)</label>
                        <input id="precio" type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" required disabled={isSubmitting} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="stock">Stock</label>
                        <input id="stock" type="number" step="1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" required disabled={isSubmitting} />
                    </div>
                </div>

                {/* Descripción */}
                <div className="form-group">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles del producto" rows="4" required disabled={isSubmitting} />
                </div>

                {/* --- Imagen Principal --- */}
                <div className="form-group image-upload-group">
                    <label htmlFor="imagenUrl">Imagen Principal (URL o Subir Archivo)</label>
                    <div className="image-inputs">
                        <input
                            id="imagenUrl" type="url" value={imagenUrl}
                            onChange={(e) => handleUrlChange(e, setImagenUrl, setImagenFile, setImagenPreview)}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            disabled={isSubmitting || isUploadingImagen} />
                        <span>O</span>
                        <input type="file" id="imagenFile" accept="image/*"
                            onChange={(e) => handleFileChange(e, setImagenFile, setImagenPreview, setImagenUrl)}
                            disabled={isSubmitting || isUploadingImagen} />
                         {isUploadingImagen && <LoaderSpinner size="small-inline" />}
                    </div>
                    {imagenPreview && <img src={imagenPreview} alt="Vista previa Imagen Principal" className="image-preview" />}
                    <small>Esta imagen se usará como portada. Requerida.</small>
                </div>

                {/* --- Imagen B --- */}
                <div className="form-group image-upload-group">
                    <label htmlFor="imagenBUrl">Imagen B (URL o Subir Archivo)</label>
                     <div className="image-inputs">
                        <input id="imagenBUrl" type="url" value={imagenBUrl}
                            onChange={(e) => handleUrlChange(e, setImagenBUrl, setImagenBFile, setImagenBPreview)}
                            placeholder="URL Imagen Opcional"
                            disabled={isSubmitting || isUploadingImagenB} />
                        <span>O</span>
                        <input type="file" id="imagenBFile" accept="image/*"
                            onChange={(e) => handleFileChange(e, setImagenBFile, setImagenBPreview, setImagenBUrl)}
                            disabled={isSubmitting || isUploadingImagenB} />
                        {isUploadingImagenB && <LoaderSpinner size="small-inline" />}
                    </div>
                    {imagenBPreview && <img src={imagenBPreview} alt="Vista previa Imagen B" className="image-preview" />}
                </div>

                {/* --- Imagen C --- */}
                <div className="form-group image-upload-group">
                    <label htmlFor="imagenCUrl">Imagen C (URL o Subir Archivo)</label>
                     <div className="image-inputs">
                        <input id="imagenCUrl" type="url" value={imagenCUrl}
                            onChange={(e) => handleUrlChange(e, setImagenCUrl, setImagenCFile, setImagenCPreview)}
                            placeholder="URL Imagen Opcional"
                            disabled={isSubmitting || isUploadingImagenC} />
                        <span>O</span>
                        <input type="file" id="imagenCFile" accept="image/*"
                            onChange={(e) => handleFileChange(e, setImagenCFile, setImagenCPreview, setImagenCUrl)}
                            disabled={isSubmitting || isUploadingImagenC} />
                        {isUploadingImagenC && <LoaderSpinner size="small-inline" />}
                    </div>
                    {imagenCPreview && <img src={imagenCPreview} alt="Vista previa Imagen C" className="image-preview" />}
                </div>

                <button type="submit" className="btn-submit" disabled={isSubmitting || isCatLoading || isUploadingImagen || isUploadingImagenB || isUploadingImagenC}>
                    {isSubmitting ? <LoaderSpinner size="small" /> : 'Crear Producto'}
                </button>
            </form>
        </div>
    );
};

export default AddProduct;