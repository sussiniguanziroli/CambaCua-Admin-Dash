import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoaderSpinner from '../components/utils/LoaderSpinner';

const EditProduct = () => {
    const { id: productId } = useParams();
    const navigate = useNavigate();

    // Estados del formulario
    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [descripcion, setDescripcion] = useState('');

    // Estados para almacenar los valores iniciales de precio y stock
    const [initialPrecio, setInitialPrecio] = useState('');
    const [initialStock, setInitialStock] = useState('');
    // Y los timestamps iniciales por si no cambian precio/stock
    const [initialPrecioLastUpdated, setInitialPrecioLastUpdated] = useState(null);
    const [initialStockLastUpdated, setInitialStockLastUpdated] = useState(null);


    const [imagenUrl, setImagenUrl] = useState('');
    const [imagenFile, setImagenFile] = useState(null);
    const [imagenPreview, setImagenPreview] = useState('');
    const [isUploadingImagen, setIsUploadingImagen] = useState(false);
    const [initialImagenUrl, setInitialImagenUrl] = useState('');

    const [imagenBUrl, setImagenBUrl] = useState('');
    const [imagenBFile, setImagenBFile] = useState(null);
    const [imagenBPreview, setImagenBPreview] = useState('');
    const [isUploadingImagenB, setIsUploadingImagenB] = useState(false);
    const [initialImagenBUrl, setInitialImagenBUrl] = useState('');

    const [imagenCUrl, setImagenCUrl] = useState('');
    const [imagenCFile, setImagenCFile] = useState(null);
    const [imagenCPreview, setImagenCPreview] = useState('');
    const [isUploadingImagenC, setIsUploadingImagenC] = useState(false);
    const [initialImagenCUrl, setInitialImagenCUrl] = useState('');

    const [categoriasDb, setCategoriasDb] = useState([]);
    const [subcategoriasDb, setSubcategoriasDb] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);
    const [productNotFound, setProductNotFound] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setFormError(null);
            setProductNotFound(false);
            let fetchedCategories = [];
            try {
                const catSnapshot = await getDocs(collection(db, 'categories'));
                fetchedCategories = catSnapshot.docs.map(doc => ({ adress: doc.data().adress, nombre: doc.data().nombre, subcategorias: doc.data().subcategorias || [] }));
                setCategoriasDb(fetchedCategories);

                const productRef = doc(db, 'productos', productId);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const data = productSnap.data();
                    setNombre(data.nombre || '');
                    setCategoria(data.categoryAdress || '');
                    setSubcategoria(data.subcategoria || '');
                    
                    const currentPrecio = data.precio !== undefined ? data.precio.toString() : '';
                    const currentStock = data.stock !== undefined ? data.stock.toString() : '';
                    setPrecio(currentPrecio);
                    setInitialPrecio(currentPrecio); // Store initial price
                    setStock(currentStock);
                    setInitialStock(currentStock); // Store initial stock
                    
                    setDescripcion(data.descripcion || '');

                    setInitialPrecioLastUpdated(data.precioLastUpdated || null); // Store initial timestamp
                    setInitialStockLastUpdated(data.stockLastUpdated || null); // Store initial timestamp

                    setImagenUrl(data.imagen || ''); setImagenPreview(data.imagen || ''); setInitialImagenUrl(data.imagen || '');
                    setImagenBUrl(data.imagenB || ''); setImagenBPreview(data.imagenB || ''); setInitialImagenBUrl(data.imagenB || '');
                    setImagenCUrl(data.imagenC || ''); setImagenCPreview(data.imagenC || ''); setInitialImagenCUrl(data.imagenC || '');

                    const initialCategoriaData = fetchedCategories.find(cat => cat.adress === data.categoryAdress);
                    setSubcategoriasDb(initialCategoriaData ? initialCategoriaData.subcategorias : []);
                } else {
                    setProductNotFound(true);
                    setFormError(`No se encontró ningún producto con el ID: ${productId}`);
                }
            } catch (err) {
                console.error("Error al cargar datos: ", err);
                setFormError("Error al cargar los datos para editar el producto.");
                Swal.fire({ icon: 'error', title: 'Error de Carga', text: 'No se pudieron cargar los datos necesarios.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [productId]);

    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categoriasDb.find(cat => cat.adress === selectedAdress);
        setCategoria(selectedAdress);
        setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
        setSubcategoria('');
    };

    const handleFileChange = (event, setFile, setPreview, setUrlState) => {
        const file = event.target.files[0];
        if (file) {
            setFile(file); setPreview(URL.createObjectURL(file)); setUrlState('');
        } else {
            setFile(null); setPreview('');
        }
    };
    
    const handleUrlChange = (event, setUrlState, setFile, setPreview) => {
        const newUrl = event.target.value;
        setUrlState(newUrl);
        if (newUrl) {
            setFile(null); setPreview(newUrl);
        } else if (!newUrl && !setFile) {
             setPreview('');
        }
    };

    const deleteOldImage = async (imageUrl) => {
        if (!imageUrl || !imageUrl.includes("firebasestorage.googleapis.com")) return;
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
            console.log("Old image deleted successfully: ", imageUrl);
        } catch (error) {
            console.warn("Could not delete old image: ", error);
        }
    };

    const uploadImageAndGetURL = async (file, currentUrl, initialDbUrl, setLoadingState, imageName, prodId) => {
        if (file) {
            setLoadingState(true);
            if (initialDbUrl && initialDbUrl.includes("firebasestorage.googleapis.com")) {
                 await deleteOldImage(initialDbUrl);
            }
            const fileName = `productos/${prodId}/${imageName}-${Date.now()}-${file.name}`;
            const storageRef = ref(storage, fileName);
            try {
                await uploadBytes(storageRef, file);
                const downloadUrl = await getDownloadURL(storageRef);
                setLoadingState(false);
                return downloadUrl;
            } catch (error) {
                console.error(`Error uploading ${imageName} for product ${prodId}: `, error);
                setLoadingState(false);
                Swal.fire('Error de Subida', `No se pudo subir la imagen ${imageName}.`, 'error');
                throw error;
            }
        } else if (currentUrl === '' && initialDbUrl && initialDbUrl.includes("firebasestorage.googleapis.com")) {
            await deleteOldImage(initialDbUrl);
            return '';
        }
        return currentUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        const selectedCat = categoriasDb.find(cat => cat.adress === categoria);
        if (!selectedCat) {
            Swal.fire('Error', 'Categoría seleccionada no es válida.', 'error');
            setIsSubmitting(false); return;
        }
        if (subcategoriasDb.length > 0 && !subcategoria) {
            Swal.fire('Campo Requerido', 'Por favor, selecciona una subcategoría.', 'warning');
            setIsSubmitting(false); return;
        }
        if (!imagenUrl && !imagenFile) {
            Swal.fire('Campo Requerido', 'Por favor, proporciona una URL para la Imagen Principal o sube un archivo.', 'warning');
            setIsSubmitting(false); return;
        }

        try {
            let finalImagenUrl = imagenUrl;
            let finalImagenBUrl = imagenBUrl;
            let finalImagenCUrl = imagenCUrl;

            finalImagenUrl = await uploadImageAndGetURL(imagenFile, imagenUrl, initialImagenUrl, setIsUploadingImagen, "principal", productId);
            finalImagenBUrl = await uploadImageAndGetURL(imagenBFile, imagenBUrl, initialImagenBUrl, setIsUploadingImagenB, "secundaria_b", productId);
            finalImagenCUrl = await uploadImageAndGetURL(imagenCFile, imagenCUrl, initialImagenCUrl, setIsUploadingImagenC, "secundaria_c", productId);
            
            const currentDate = new Date();
            const productDataToUpdate = {
                nombre: nombre.trim(),
                categoria: selectedCat.nombre,
                categoryAdress: categoria,
                subcategoria: subcategoria,
                precio: parseFloat(precio) || 0,
                stock: parseInt(stock) || 0,
                descripcion: descripcion.trim(),
                imagen: finalImagenUrl || '',
                imagenB: finalImagenBUrl || '',
                imagenC: finalImagenCUrl || '',
                updatedAt: currentDate,
                // Conditionally update timestamps
                precioLastUpdated: (parseFloat(precio) || 0) !== (parseFloat(initialPrecio) || 0) ? currentDate : initialPrecioLastUpdated || currentDate,
                stockLastUpdated: (parseInt(stock) || 0) !== (parseInt(initialStock) || 0) ? currentDate : initialStockLastUpdated || currentDate,
            };

            const productRef = doc(db, 'productos', productId);
            await updateDoc(productRef, productDataToUpdate);

            Swal.fire({ icon: 'success', title: 'Producto Actualizado', text: `"${nombre}" ha sido actualizado.`, timer: 2000, showConfirmButton: false });
            navigate('/admin/products');

        } catch (err) {
            console.error("Error al actualizar el producto: ", err);
             if (!err.message.includes("No se pudo subir la imagen")) {
                setFormError("Ocurrió un error al guardar los cambios.");
                Swal.fire({ icon: 'error', title: 'Error al Guardar', text: 'No se pudieron guardar los cambios.' });
            }
        } finally {
            setIsSubmitting(false);
            setIsUploadingImagen(false);
            setIsUploadingImagenB(false);
            setIsUploadingImagenC(false);
        }
    };

    // JSX (sin cambios)
    if (isLoading) return (<div className="loader-container" style={{ minHeight: '60vh' }}><LoaderSpinner size="large" /></div>);
    if (productNotFound) return <p className="error-message">{formError || 'Producto no encontrado.'}</p>;

    return (
        <div className="product-form-container">
            <h2>Editar Producto</h2>
            {formError && !isLoading && !productNotFound && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{formError}</p>}
            <form onSubmit={handleSubmit} className="product-form">
                 {/* Nombre */}
                 <div className="form-group">
                    <label htmlFor="nombreEdit">Nombre</label>
                    <input id="nombreEdit" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" required disabled={isSubmitting} />
                </div>

                {/* Categoría */}
                <div className="form-group">
                    <label htmlFor="categoriaEdit">Categoría</label>
                    <select id="categoriaEdit" value={categoria} onChange={handleCategoriaChange} required disabled={isSubmitting}>
                        <option value="" disabled>Seleccionar Categoría</option>
                        {categoriasDb.map(cat => (<option key={cat.adress} value={cat.adress}>{cat.nombre}</option>))}
                    </select>
                </div>

                {/* Subcategoría */}
                {subcategoriasDb.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="subcategoriaEdit">Subcategoría</label>
                        <select id="subcategoriaEdit" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required disabled={isSubmitting || !categoria}>
                            <option value="" disabled>Seleccionar Subcategoría</option>
                            {subcategoriasDb.map(subcat => (<option key={subcat} value={subcat}>{subcat}</option>))}
                        </select>
                    </div>
                )}

                {/* Precio y Stock */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="precioEdit">Precio ($)</label>
                        <input id="precioEdit" type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" required disabled={isSubmitting} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="stockEdit">Stock</label>
                        <input id="stockEdit" type="number" step="1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" required disabled={isSubmitting} />
                    </div>
                </div>

                {/* Descripción */}
                <div className="form-group">
                    <label htmlFor="descripcionEdit">Descripción</label>
                    <textarea id="descripcionEdit" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles del producto" rows="4" required disabled={isSubmitting} />
                </div>

                {/* --- Imagen Principal --- */}
                <div className="form-group image-upload-group">
                    <label htmlFor="imagenUrlEdit">Imagen Principal (URL o Subir Archivo)</label>
                    <div className="image-inputs">
                        <input id="imagenUrlEdit" type="url" value={imagenUrl}
                            onChange={(e) => handleUrlChange(e, setImagenUrl, setImagenFile, setImagenPreview)}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            disabled={isSubmitting || isUploadingImagen} />
                        <span>O</span>
                        <input type="file" id="imagenFileEdit" accept="image/*"
                            onChange={(e) => handleFileChange(e, setImagenFile, setImagenPreview, setImagenUrl)}
                            disabled={isSubmitting || isUploadingImagen} />
                        {isUploadingImagen && <LoaderSpinner size="small-inline" />}
                    </div>
                    {imagenPreview && <img src={imagenPreview} alt="Vista previa Imagen Principal" className="image-preview" />}
                     <small>Esta imagen se usará como portada. Requerida.</small>
                </div>

                {/* --- Imagen B --- */}
                <div className="form-group image-upload-group">
                    <label htmlFor="imagenBUrlEdit">Imagen B (URL o Subir Archivo)</label>
                    <div className="image-inputs">
                        <input id="imagenBUrlEdit" type="url" value={imagenBUrl}
                            onChange={(e) => handleUrlChange(e, setImagenBUrl, setImagenBFile, setImagenBPreview)}
                            placeholder="URL Imagen Opcional"
                            disabled={isSubmitting || isUploadingImagenB} />
                        <span>O</span>
                        <input type="file" id="imagenBFileEdit" accept="image/*"
                            onChange={(e) => handleFileChange(e, setImagenBFile, setImagenBPreview, setImagenBUrl)}
                            disabled={isSubmitting || isUploadingImagenB} />
                        {isUploadingImagenB && <LoaderSpinner size="small-inline" />}
                    </div>
                    {imagenBPreview && <img src={imagenBPreview} alt="Vista previa Imagen B" className="image-preview" />}
                </div>

                {/* --- Imagen C --- */}
                <div className="form-group image-upload-group">
                    <label htmlFor="imagenCUrlEdit">Imagen C (URL o Subir Archivo)</label>
                    <div className="image-inputs">
                        <input id="imagenCUrlEdit" type="url" value={imagenCUrl}
                            onChange={(e) => handleUrlChange(e, setImagenCUrl, setImagenCFile, setImagenCPreview)}
                            placeholder="URL Imagen Opcional"
                            disabled={isSubmitting || isUploadingImagenC} />
                        <span>O</span>
                        <input type="file" id="imagenCFileEdit" accept="image/*"
                            onChange={(e) => handleFileChange(e, setImagenCFile, setImagenCPreview, setImagenCUrl)}
                            disabled={isSubmitting || isUploadingImagenC} />
                        {isUploadingImagenC && <LoaderSpinner size="small-inline" />}
                    </div>
                    {imagenCPreview && <img src={imagenCPreview} alt="Vista previa Imagen C" className="image-preview" />}
                </div>

                <button type="submit" className="btn-submit" disabled={isSubmitting || isLoading || isUploadingImagen || isUploadingImagenB || isUploadingImagenC}>
                    {isSubmitting ? <LoaderSpinner size="small" /> : 'Actualizar Producto'}
                </button>
            </form>
        </div>
    );
};

export default EditProduct;
