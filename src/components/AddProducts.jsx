import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoaderSpinner from './utils/LoaderSpinner';
import VariationManager from './modules/VariationManager'; 

const AddProduct = () => {
    const navigate = useNavigate();

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

    const [categoriasDb, setCategoriasDb] = useState([]);
    const [subcategoriasDb, setSubcategoriasDb] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(true);
    const [formError, setFormError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [hasVariations, setHasVariations] = useState(false);
    const [variations, setVariations] = useState([]); 
    const [isAnyVariationImageUploading, setIsAnyVariationImageUploading] = useState(false); 

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
                setCategoriasDb(categoriesData);
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
            setFile(file);
            setPreview(URL.createObjectURL(file));
            setUrlState(''); 
        } else {
            setFile(null);
            setPreview('');
        }
    };

    const handleUrlChange = (event, setUrlState, setFile, setPreview) => {
        const newUrl = event.target.value;
        setUrlState(newUrl);
        if (newUrl) {
            setFile(null); 
            setPreview(newUrl); 
        } else {
            setPreview('');
        }
    };

    const uploadImageAndGetURL = async (file, currentUrl, setLoadingState, imageName, productId) => {
        if (!file && !currentUrl) return ''; 
        if (!file && currentUrl) return currentUrl; 

        if (!productId) {
            Swal.fire('Error Interno', 'No se pudo obtener el ID del producto para subir la imagen.', 'error');
            throw new Error("Product ID missing for image upload.");
        }

        setLoadingState(true);

        const path = `productos/${productId}/${imageName}-${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
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
        setHasVariations(false);
        setVariations([]); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        const selectedCat = categoriasDb.find(cat => cat.adress === categoria);
        if (!selectedCat) {
            Swal.fire('Error', 'Debes seleccionar una categoría válida.', 'error');
            setIsSubmitting(false); return;
        }
        if (subcategoriasDb.length > 0 && !subcategoria) {
            Swal.fire('Campo Requerido', 'Por favor, selecciona una subcategoría.', 'warning');
            setIsSubmitting(false); return;
        }

        try {
            const currentDate = new Date();

            if (!hasVariations) {

                if (!imagenUrl && !imagenFile) {
                    Swal.fire('Campo Requerido', 'Por favor, proporciona una URL para la Imagen Principal o sube un archivo.', 'warning');
                    setIsSubmitting(false); return;
                }

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
                    updatedAt: currentDate,
                    precioLastUpdated: currentDate,
                    stockLastUpdated: currentDate,
                    hasVariations: false,
                    variationsList: [] 
                };

                const newDocRef = await addDoc(collection(db, 'productos'), productDataInitial);
                const newProductId = newDocRef.id;

                let finalImagenUrl = await uploadImageAndGetURL(imagenFile, imagenUrl, setIsUploadingImagen, "principal", newProductId);
                let finalImagenBUrl = await uploadImageAndGetURL(imagenBFile, imagenBUrl, setIsUploadingImagenB, "secundaria_b", newProductId);
                let finalImagenCUrl = await uploadImageAndGetURL(imagenCFile, imagenCUrl, setIsUploadingImagenC, "secundaria_c", newProductId);

                await updateDoc(doc(db, 'productos', newProductId), {
                    imagen: finalImagenUrl || '',
                    imagenB: finalImagenBUrl || '',
                    imagenC: finalImagenCUrl || '',
                });

            } else {

                if (variations.length === 0) {
                    Swal.fire('Campo Requerido', 'Debes añadir al menos una variación.', 'warning');
                    setIsSubmitting(false); return;
                }

                for (const variation of variations) {
                    if (isNaN(parseFloat(variation.precio)) || isNaN(parseInt(variation.stock))) {
                        Swal.fire('Campo Requerido', 'Todas las variaciones deben tener precio y stock válidos.', 'warning');
                        setIsSubmitting(false); return;
                    }
                    if (!variation.imagen && !variation.imagenFile && !variation.imagenPreview) { 
                        Swal.fire('Campo Requerido', `La variación necesita una Imagen Principal.`, 'warning');
                        setIsSubmitting(false); return;
                    }
                    if (Object.keys(variation.attributes || {}).length === 0 || Object.values(variation.attributes).some(val => !val)) {
                        Swal.fire('Campo Requerido', 'Todas las variaciones deben tener al menos un atributo con nombre y valor.', 'warning');
                        setIsSubmitting(false); return;
                    }
                }

                const baseProductData = {
                    activo: true, 
                    nombre: nombre.trim(),
                    categoria: selectedCat.nombre,
                    categoryAdress: categoria,
                    subcategoria: subcategoria,
                    descripcion: descripcion.trim(),
                    hasVariations: true,
                    createdAt: currentDate,
                    updatedAt: currentDate,

                    precio: null,
                    stock: null,
                    imagen: null,
                    imagenB: null,
                    imagenC: null,
                    precioLastUpdated: null,
                    stockLastUpdated: null,
                    variationsList: [] 
                };

                const newDocRef = await addDoc(collection(db, 'productos'), baseProductData);
                const newProductId = newDocRef.id;

                const processedVariations = [];
                for (const variation of variations) {

                    const formattedAttributes = variation.attributes; 

                    processedVariations.push({
                        id: variation.id,
                        attributes: formattedAttributes,
                        precio: parseFloat(variation.precio) || 0,
                        stock: parseInt(variation.stock) || 0,
                        imagen: variation.imagen || '', 
                        imagenB: variation.imagenB || '',
                        imagenC: variation.imagenC || '',
                        activo: variation.activo !== undefined ? variation.activo : true, 
                        createdAt: currentDate,
                        updatedAt: currentDate,
                        precioLastUpdated: currentDate,
                        stockLastUpdated: currentDate,
                    });
                }

                await updateDoc(doc(db, 'productos', newProductId), {
                    variationsList: processedVariations
                });
            }

            Swal.fire({
                icon: 'success', title: 'Producto Creado',
                text: `"${nombre}" ha sido agregado exitosamente.`,
                timer: 2000, showConfirmButton: false
            });
            resetForm();
            navigate('/admin/products'); 

        } catch (error) {
            console.error('Error al crear el producto: ', error);
            setFormError("Ocurrió un error al crear el producto.");
            Swal.fire({ icon: 'error', title: 'Error al Crear', text: 'No se pudo crear el producto. Inténtalo de nuevo.' });
        } finally {
            setIsSubmitting(false);
            setIsUploadingImagen(false);
            setIsUploadingImagenB(false);
            setIsUploadingImagenC(false);

        }
    };

    return (
        <div className="product-form-container">
            <h2>Agregar Nuevo Producto</h2>
            {formError && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{formError}</p>}
            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                    <label htmlFor="nombre">Nombre</label>
                    <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del producto" required disabled={isSubmitting} />
                </div>

                <div className="form-group">
                    <label htmlFor="categoria">Categoría</label>
                    <select id="categoria" value={categoria} onChange={handleCategoriaChange} required disabled={isSubmitting || isCatLoading}>
                        <option value="" disabled>{isCatLoading ? 'Cargando Cat...' : 'Seleccionar Categoría'}</option>
                        {categoriasDb.map(cat => (<option key={cat.adress} value={cat.adress}>{cat.nombre}</option>))}
                    </select>
                </div>

                {subcategoriasDb.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="subcategoria">Subcategoría</label>
                        <select id="subcategoria" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required disabled={isSubmitting || !categoria}>
                            <option value="" disabled>Seleccionar Subcategoría</option>
                            {subcategoriasDb.map(subcat => (<option key={subcat} value={subcat}>{subcat}</option>))}
                        </select>
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles del producto" rows="4" required disabled={isSubmitting} />
                </div>

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={hasVariations}
                            onChange={(e) => {
                                setHasVariations(e.target.checked);
                                if (!e.target.checked) {
                                    setVariations([]); 
                                } else {

                                    setPrecio('');
                                    setStock('');
                                    setImagenUrl('');
                                    setImagenFile(null);
                                    setImagenPreview('');
                                    setImagenBUrl('');
                                    setImagenBFile(null);
                                    setImagenBPreview('');
                                    setImagenCUrl('');
                                    setImagenCFile(null);
                                    setImagenCPreview('');
                                }
                            }}
                            disabled={isSubmitting}
                        />
                        Producto con Variaciones
                    </label>
                </div>

                {!hasVariations ? (
                    <>
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
                    </>
                ) : (
                    <>
                        <p className="info-message" style={{ textAlign: 'center', marginBottom: '15px' }}>
                            Añade y gestiona las variaciones de tu producto aquí.
                        </p>
                        <VariationManager
                            productId={null} 
                            variations={variations}
                            setVariations={setVariations}
                            isSubmitting={isSubmitting}
                            onAnyVariationImageUploadingChange={setIsAnyVariationImageUploading}
                        />
                    </>
                )}

                <button
                    type="submit"
                    className="btn-submit"
                    disabled={isSubmitting || isCatLoading || isUploadingImagen || isUploadingImagenB || isUploadingImagenC || isAnyVariationImageUploading}
                >
                    {isSubmitting ? <LoaderSpinner size="small" /> : 'Crear Producto'}
                </button>
            </form>
        </div>
    );
};

export default AddProduct;
