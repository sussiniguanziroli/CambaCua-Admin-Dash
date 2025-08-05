import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import LoaderSpinner from '../components/utils/LoaderSpinner'; 
import VariationManager from '../components/modules/VariationManager'; 

const EditProduct = () => {
    const { id: productId } = useParams();
    const navigate = useNavigate();

    const [nombre, setNombre] = useState('');
    const [categoria, setCategoria] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [descripcion, setDescripcion] = useState('');

    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const [initialPrecio, setInitialPrecio] = useState('');
    const [initialStock, setInitialStock] = useState('');
    const [initialPrecioLastUpdated, setInitialPrecioLastUpdated] = useState(null);
    const [initialStockLastUpdated, setInitialStockLastUpdated] = useState(null);

    const [imagenUrl, setImagenUrl] = useState('');
    const [imagenFile, setImagenFile] = useState(null);
    const [imagenPreview, setImagenPreview] = useState('');
    const [oldImagenUrl, setOldImagenUrl] = useState('');
    const [isUploadingImagen, setIsUploadingImagen] = useState(false);

    const [imagenBUrl, setImagenBUrl] = useState('');
    const [imagenBFile, setImagenBFile] = useState(null);
    const [imagenBPreview, setImagenBPreview] = useState('');
    const [oldImagenBUrl, setOldImagenBUrl] = useState('');
    const [isUploadingImagenB, setIsUploadingImagenB] = useState(false);

    const [imagenCUrl, setImagenCUrl] = useState('');
    const [imagenCFile, setImagenCFile] = useState(null);
    const [imagenCPreview, setImagenCPreview] = useState('');
    const [oldImagenCUrl, setOldImagenCUrl] = useState('');
    const [isUploadingImagenC, setIsUploadingImagenC] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true); 
    const [formError, setFormError] = useState(null);

    const [categoriasDb, setCategoriasDb] = useState([]);
    const [subcategoriasDb, setSubcategoriasDb] = useState([]);
    const [isCatLoading, setIsCatLoading] = useState(false);

    const [hasVariations, setHasVariations] = useState(false);
    const [variations, setVariations] = useState([]);
    const [initialVariations, setInitialVariations] = useState([]); 
    const [isAnyVariationImageUploading, setIsAnyVariationImageUploading] = useState(false); 

    useEffect(() => {
        const fetchCategories = async () => {
            setIsCatLoading(true);
            try {
                const snapshot = await getDocs(collection(db, 'categories'));
                const categoriesData = snapshot.docs.map(doc => ({
                    adress: doc.data().adress,
                    nombre: doc.data().nombre,
                    subcategorias: doc.data().subcategorias || []
                }));
                setCategoriasDb(categoriesData);
            } catch (error) {
                console.error("Error al cargar categorías y subcategorías:", error);
                Swal.fire("Error", "No se pudieron cargar las categorías y subcategorías.", "error");
            } finally {
                setIsCatLoading(false);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchProductData = async () => {
            setIsLoading(true);
            try {
                const productRef = doc(db, 'productos', productId);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const data = productSnap.data();
                    setNombre(data.nombre);
                    setCategoria(data.categoryAdress || data.categoria);
                    setDescripcion(data.descripcion);
                    setHasVariations(data.hasVariations || false);

                    const selectedCat = categoriasDb.find(cat => cat.adress === (data.categoryAdress || data.categoria));
                    setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
                    setSubcategoria(data.subcategoria || '');

                    if (!data.hasVariations) {

                        setPrecio(data.precio ? data.precio.toString() : '');
                        setStock(data.stock ? data.stock.toString() : '');
                        setInitialPrecio(data.precio ? data.precio.toString() : '');
                        setInitialStock(data.stock ? data.stock.toString() : '');
                        setInitialPrecioLastUpdated(data.precioLastUpdated?.toDate ? data.precioLastUpdated.toDate() : null);
                        setInitialStockLastUpdated(data.stockLastUpdated?.toDate ? data.stockLastUpdated.toDate() : null);

                        setImagenUrl(data.imagen || '');
                        setImagenPreview(data.imagen || '');
                        setOldImagenUrl(data.imagen || '');

                        setImagenBUrl(data.imagenB || '');
                        setImagenBPreview(data.imagenB || '');
                        setOldImagenBUrl(data.imagenB || '');

                        setImagenCUrl(data.imagenC || '');
                        setImagenCPreview(data.imagenC || '');
                        setOldImagenCUrl(data.imagenC || '');
                    } else {

                        const fetchedVariations = (data.variationsList || []).map(v => ({
                            ...v,

                            attributes: Array.isArray(v.attributes) ? v.attributes.reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {}) : (v.attributes || {}),
                            imagenPreview: v.imagen || '',
                            imagenBPreview: v.imagenB || '',
                            imagenCPreview: v.imagenC || '',
                            activo: v.activo !== undefined ? v.activo : true, 

                            createdAt: v.createdAt?.toDate ? v.createdAt.toDate() : null,
                            updatedAt: v.updatedAt?.toDate ? v.updatedAt.toDate() : null,
                            precioLastUpdated: v.precioLastUpdated?.toDate ? v.precioLastUpdated.toDate() : null,
                            stockLastUpdated: v.stockLastUpdated?.toDate ? v.stockLastUpdated.toDate() : null,
                        }));
                        setVariations(fetchedVariations);

                        setInitialVariations(JSON.parse(JSON.stringify(fetchedVariations)));
                    }
                } else {
                    Swal.fire("Error", "Producto no encontrado.", "error");
                    navigate('/admin/products'); 
                }
            } catch (error) {
                console.error("Error al cargar los datos del producto:", error);
                Swal.fire("Error", "No se pudieron cargar los datos del producto.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (categoriasDb.length > 0) {
            fetchProductData();
        }
    }, [productId, navigate, categoriasDb]); 

    const handleCategoriaChange = (e) => {
        const selectedAdress = e.target.value;
        const selectedCat = categoriasDb.find(cat => cat.adress === selectedAdress);
        setCategoria(selectedAdress);
        setSubcategoriasDb(selectedCat ? selectedCat.subcategorias : []);
        setSubcategoria(''); 
    };

    const uploadImageAndGetURL = async (file, currentUrl, setLoadingState, imageName, prodId) => {
        if (!file && !currentUrl) return ''; 
        if (!file && currentUrl) return currentUrl; 

        setLoadingState(true);

        const path = `productos/${prodId}/${imageName}-${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
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
    };

    const deleteOldImage = async (url) => {
        if (!url || !url.includes("firebasestorage.googleapis.com")) return; 
        try {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef);
            console.log(`Old image ${url} deleted successfully.`);
        } catch (error) {
            if (error.code === 'storage/object-not-found') {
                console.warn("La imagen a eliminar no fue encontrada en Storage:", url);
            } else {
                console.error("Error al eliminar la imagen antigua:", error);
            }
        }
    };

    const handleFileChange = (e, setFile, setPreview, setUrl) => {
        const file = e.target.files[0];
        setFile(file);
        setUrl(''); 
        if (file) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview('');
        }
    };

    const handleUrlChange = (e, setUrl, setFile, setPreview) => {
        const url = e.target.value;
        setUrl(url);
        setFile(null); 
        setPreview(url); 
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

                let currentImagenUrl = imagenUrl;
                let currentImagenBUrl = imagenBUrl;
                let currentImagenCUrl = imagenCUrl;

                if (imagenFile) {
                    setIsUploadingImagen(true);
                    await deleteOldImage(oldImagenUrl); 
                    currentImagenUrl = await uploadImageAndGetURL(imagenFile, imagenUrl, setIsUploadingImagen, "principal", productId);
                    setIsUploadingImagen(false);
                } else if (!imagenUrl && oldImagenUrl) {

                    await deleteOldImage(oldImagenUrl);
                    currentImagenUrl = '';
                }

                if (imagenBFile) {
                    setIsUploadingImagenB(true);
                    await deleteOldImage(oldImagenBUrl);
                    currentImagenBUrl = await uploadImageAndGetURL(imagenBFile, imagenBUrl, setIsUploadingImagenB, "secundaria_b", productId);
                    setIsUploadingImagenB(false);
                } else if (!imagenBUrl && oldImagenBUrl) {
                    await deleteOldImage(oldImagenBUrl);
                    currentImagenBUrl = '';
                }

                if (imagenCFile) {
                    setIsUploadingImagenC(true);
                    await deleteOldImage(oldImagenCUrl);
                    currentImagenCUrl = await uploadImageAndGetURL(imagenCFile, imagenCUrl, setIsUploadingImagenC, "secundaria_c", productId);
                    setIsUploadingImagenC(false);
                } else if (!imagenCUrl && oldImagenCUrl) {
                    await deleteOldImage(oldImagenCUrl);
                    currentImagenCUrl = '';
                }

                const updatedData = {
                    nombre: nombre.trim(),
                    categoria: selectedCat.nombre,
                    categoryAdress: categoria,
                    subcategoria: subcategoria,
                    descripcion: descripcion.trim(),
                    imagen: currentImagenUrl,
                    imagenB: currentImagenBUrl,
                    imagenC: currentImagenCUrl,
                    updatedAt: currentDate,
                    hasVariations: false, 

                    variationsList: []
                };

                if (parseFloat(precio) !== parseFloat(initialPrecio)) {
                    updatedData.precio = parseFloat(precio);
                    updatedData.precioLastUpdated = new Date();
                } else {
                    updatedData.precio = parseFloat(precio); 
                    updatedData.precioLastUpdated = initialPrecioLastUpdated || currentDate;
                }

                if (parseInt(stock) !== parseInt(initialStock)) {
                    updatedData.stock = parseInt(stock);
                    updatedData.stockLastUpdated = new Date();
                } else {
                    updatedData.stock = parseInt(stock); 
                    updatedData.stockLastUpdated = initialStockLastUpdated || currentDate;
                }

                await updateDoc(doc(db, 'productos', productId), updatedData);

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
                    if (!variation.imagen && !variation.imagenFile) {
                        Swal.fire('Campo Requerido', `La variación necesita una Imagen Principal.`, 'warning');
                        setIsSubmitting(false); return;
                    }
                    if (Object.keys(variation.attributes || {}).length === 0 || Object.values(variation.attributes).some(val => !val)) {
                        Swal.fire('Campo Requerido', 'Todas las variaciones deben tener al menos un atributo con nombre y valor.', 'warning');
                        setIsSubmitting(false); return;
                    }
                }

                const processedVariations = variations.map(variation => {
                    const initialVar = initialVariations.find(v => v.id === variation.id);

                    const precioChanged = parseFloat(variation.precio) !== parseFloat(initialVar?.precio);
                    const stockChanged = parseInt(variation.stock) !== parseInt(initialVar?.stock);

                    return {
                        id: variation.id,
                        attributes: variation.attributes, 
                        precio: parseFloat(variation.precio) || 0,
                        stock: parseInt(variation.stock) || 0,
                        imagen: variation.imagen || '',
                        imagenB: variation.imagenB || '',
                        imagenC: variation.imagenC || '',
                        activo: variation.activo,
                        createdAt: initialVar?.createdAt || currentDate, 
                        updatedAt: currentDate, 
                        precioLastUpdated: precioChanged ? currentDate : (initialVar?.precioLastUpdated || currentDate),
                        stockLastUpdated: stockChanged ? currentDate : (initialVar?.stockLastUpdated || currentDate),
                    };
                });

                await updateDoc(doc(db, 'productos', productId), {
                    nombre: nombre.trim(),
                    categoria: selectedCat.nombre,
                    categoryAdress: categoria,
                    subcategoria: subcategoria,
                    descripcion: descripcion.trim(),
                    updatedAt: currentDate,
                    variationsList: processedVariations,
                    hasVariations: true, 

                    precio: null,
                    stock: null,
                    imagen: null,
                    imagenB: null,
                    imagenC: null,
                    precioLastUpdated: null,
                    stockLastUpdated: null,
                });
            }

            Swal.fire({
                title: "Producto Actualizado!",
                text: "Los cambios han sido guardados correctamente.",
                icon: "success"
            });
            navigate('/admin/products');
        } catch (error) {
            console.error("Error al actualizar el producto:", error);
            setFormError("Ocurrió un error al actualizar el producto.");
            Swal.fire("Error", "Hubo un problema al actualizar el producto.", "error");
        } finally {
            setIsSubmitting(false);
            setIsUploadingImagen(false);
            setIsUploadingImagenB(false);
            setIsUploadingImagenC(false);

        }
    };

    if (isLoading) {
        return <LoaderSpinner />;
    }

    return (
        <div className="product-form-container">
            <h2>Editar Producto</h2>
            {formError && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{formError}</p>}
            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                    <label htmlFor="nombre">Nombre</label>
                    <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required disabled={isSubmitting} />
                </div>

                <div className="form-group">
                    <label htmlFor="descripcion">Descripción</label>
                    <textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required disabled={isSubmitting}></textarea>
                </div>

                <div className="form-group">
                    <label htmlFor="categoria">Categoría</label>
                    {isCatLoading ? (
                        <LoaderSpinner size="small-inline" />
                    ) : (
                        <select id="categoria" value={categoria} onChange={handleCategoriaChange} required disabled={isSubmitting}>
                            <option value="">Selecciona una categoría</option>
                            {categoriasDb.map((cat) => (
                                <option key={cat.adress} value={cat.adress}>{cat.nombre}</option>
                            ))}
                        </select>
                    )}
                </div>

                {subcategoriasDb.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="subcategoria">Subcategoría</label>
                        <select id="subcategoria" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} disabled={isSubmitting}>
                            <option value="">Selecciona una subcategoría (opcional)</option>
                            {subcategoriasDb.map((sub, index) => (
                                <option key={index} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                )}

                {}
                {!hasVariations ? (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="precio">Precio</label>
                                <input id="precio" type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} required disabled={isSubmitting} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="stock">Stock</label>
                                <input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} required disabled={isSubmitting} />
                            </div>
                        </div>

                        <div className="form-group image-upload-group">
                            <label htmlFor="imagenUrlEdit">Imagen Principal (URL o Subir Archivo)</label>
                            <div className="image-inputs">
                                <input id="imagenUrlEdit" type="url" value={imagenUrl}
                                    onChange={(e) => handleUrlChange(e, setImagenUrl, setImagenFile, setImagenPreview)}
                                    placeholder="URL Imagen Principal"
                                    disabled={isSubmitting || isUploadingImagen} />
                                <span>O</span>
                                <input type="file" id="imagenFileEdit" accept="image/*"
                                    onChange={(e) => handleFileChange(e, setImagenFile, setImagenPreview, setImagenUrl)}
                                    disabled={isSubmitting || isUploadingImagen} />
                                {isUploadingImagen && <LoaderSpinner size="small-inline" />}
                            </div>
                            {imagenPreview && <img src={imagenPreview} alt="Vista previa Imagen Principal" className="image-preview" />}
                        </div>

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
                        <p className="info-message" style={{ textAlign: 'center', marginTop: '20px' }}>
                            Para añadir variaciones a este producto, por favor, crea un nuevo producto desde la sección "Añadir Nuevo Producto" y selecciona la opción "Producto con Variaciones".
                        </p>
                    </>
                ) : (

                    <>
                        <p className="info-message" style={{ textAlign: 'center', marginBottom: '15px' }}>
                            Este producto tiene variaciones y no puede ser convertido a un producto simple.
                        </p>
                        <VariationManager
                            productId={productId}
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
                    disabled={isSubmitting || isLoading || isUploadingImagen || isUploadingImagenB || isUploadingImagenC || isAnyVariationImageUploading}
                >
                    {isSubmitting ? <LoaderSpinner size="small" /> : 'Actualizar Producto'}
                </button>
            </form>
        </div>
    );
};

export default EditProduct;