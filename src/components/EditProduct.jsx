import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase'; 
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage'; 
import VariationManager from './modules/VariationManager'; 
import Swal from 'sweetalert2'; 

const EditProduct = () => {
  const [prodId, setProdId] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imagen, setImagen] = useState(null); 
  const [imagenB, setImagenB] = useState(null); 
  const [imagenC, setImagenC] = useState(null); 
  const [imagenUrl, setImagenUrl] = useState(''); 
  const [imagenBUrl, setImagenBUrl] = useState(''); 
  const [imagenCUrl, setImagenCUrl] = useState(''); 
  const [oldImagenUrl, setOldImagenUrl] = useState(''); 
  const [oldImagenBUrl, setOldImagenBUrl] = useState(''); 
  const [oldImagenCUrl, setOldImagenCUrl] = useState(''); 
  const [variaciones, setVariaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProductData = async () => {
      const { id } = location.state; 
      if (id) {
        setProdId(id);
        const docRef = doc(db, 'productos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombre(data.nombre);
          setDescripcion(data.descripcion);
          setPrecio(data.precio);
          setStock(data.stock);
          setCategoria(data.categoria);
          setImagenUrl(data.imagen || ''); 
          setOldImagenUrl(data.imagen || ''); 
          setImagenBUrl(data.imagenB || '');
          setOldImagenBUrl(data.imagenB || '');
          setImagenCUrl(data.imagenC || '');
          setOldImagenCUrl(data.imagenC || '');

          const variationsQuery = query(
            collection(db, 'variaciones'),
            where('id_producto', '==', id)
          );
          const querySnapshot = await getDocs(variationsQuery);
          const fetchedVariations = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setVariaciones(fetchedVariations);
        } else {
          console.log('No such document!');
          Swal.fire('Error', 'Producto no encontrado.', 'error');
          navigate('/admin/products');
        }
      }
    };
    fetchProductData();
  }, [location.state, navigate]); 

  const deleteOldImage = async (url) => {
    if (!url || !url.includes("firebasestorage.googleapis.com")) {

      return;
    }
    try {
      const oldImageRef = ref(storage, url);
      await deleteObject(oldImageRef);
      console.log(`Old image ${url} deleted successfully.`);
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        console.warn(`Image not found in Storage, skipping deletion: ${url}`);
      } else {
        console.error(`Error deleting old image ${url}:`, error);
      }
    }
  };

  const uploadImageAndGetURL = async (imageFile, oldImageUrlToDelete, imageType) => {

    await deleteOldImage(oldImageUrlToDelete);

    const imageName = `${imageType}-${Date.now()}-${imageFile.name}`;
    const storageRef = ref(storage, `productos/${prodId}/${imageName}`);
    try {
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error(`Error uploading ${imageType} image:`, error);
      throw error; 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalImagenUrl = imagenUrl;
    let finalImagenBUrl = imagenBUrl;
    let finalImagenCUrl = imagenCUrl;

    try {

      if (imagen) { 
        finalImagenUrl = await uploadImageAndGetURL(imagen, oldImagenUrl, "principal");
      } else if (imagenUrl === '' && oldImagenUrl !== '') { 
        await deleteOldImage(oldImagenUrl);
        finalImagenUrl = '';
      } else { 
        finalImagenUrl = imagenUrl; 
      }

      if (imagenB) { 
        finalImagenBUrl = await uploadImageAndGetURL(imagenB, oldImagenBUrl, "secundaria_b");
      } else if (imagenBUrl === '' && oldImagenBUrl !== '') { 
        await deleteOldImage(oldImagenBUrl);
        finalImagenBUrl = '';
      } else { 
        finalImagenBUrl = imagenBUrl;
      }

      if (imagenC) { 
        finalImagenCUrl = await uploadImageAndGetURL(imagenC, oldImagenCUrl, "secundaria_c");
      } else if (imagenCUrl === '' && oldImagenCUrl !== '') { 
        await deleteOldImage(oldImagenCUrl);
        finalImagenCUrl = '';
      } else { 
        finalImagenCUrl = imagenCUrl;
      }

      const productDocRef = doc(db, 'productos', prodId);
      await updateDoc(productDocRef, {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
        imagen: finalImagenUrl,
        imagenB: finalImagenBUrl,
        imagenC: finalImagenCUrl,

      });

      Swal.fire({
        icon: 'success',
        title: 'Producto Actualizado!',
        text: 'Los cambios han sido guardados correctamente.',
      });
      navigate('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire('Error', `Error al actualizar el producto: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to delete this product and all its associated images and variations? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {

        const productImagesRef = ref(storage, `productos/${prodId}`);
        const imagesSnapshot = await listAll(productImagesRef);
        await Promise.all(
          imagesSnapshot.items.map((itemRef) => deleteObject(itemRef))
        );

        const variationsQuery = query(collection(db, 'variaciones'), where('id_producto', '==', prodId));
        const variationsSnapshot = await getDocs(variationsQuery);
        await Promise.all(
          variationsSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        );

        const productDocRef = doc(db, 'productos', prodId);
        await deleteDoc(productDocRef);

        Swal.fire(
          'Deleted!',
          'The product and all its associated data have been deleted.',
          'success'
        );
        navigate('/admin/products');
      } catch (error) {
        console.error('Error removing product:', error);
        Swal.fire(
          'Error!',
          `Failed to delete product: ${error.message}`,
          'error'
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = (e, setFile, setUrl) => {
    const file = e.target.files[0];
    setFile(file);
    if (file) {
      setUrl(URL.createObjectURL(file)); 
    } else {
      setUrl('');
    }
  };

  const handleUrlChange = (e, setUrl, setFile) => {
    const url = e.target.value;
    setUrl(url);
    setFile(null); 
  };

  return (
    <div className="edit-product-container">
      <h2>Edit Product</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Product Name</label>
          <input
            type="text"
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="descripcion">Description</label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="precio">Price</label>
          <input
            type="number"
            id="precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="stock">Stock</label>
          <input
            type="number"
            id="stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="categoria">Category</label>
          <input
            type="text"
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="imagen">Main Image</label>
          <input type="file" id="imagen" onChange={(e) => handleFileChange(e, setImagen, setImagenUrl)} />
          <input type="url" value={imagenUrl} onChange={(e) => handleUrlChange(e, setImagenUrl, setImagen)} placeholder="Or paste image URL" />
          {imagenUrl && <img src={imagenUrl} alt="Current Main" className="image-preview" />}
        </div>
        <div className="form-group">
          <label htmlFor="imagenB">Secondary Image B</label>
          <input type="file" id="imagenB" onChange={(e) => handleFileChange(e, setImagenB, setImagenBUrl)} />
          <input type="url" value={imagenBUrl} onChange={(e) => handleUrlChange(e, setImagenBUrl, setImagenB)} placeholder="Or paste image URL" />
          {imagenBUrl && <img src={imagenBUrl} alt="Current Secondary B" className="image-preview" />}
        </div>
        <div className="form-group">
          <label htmlFor="imagenC">Secondary Image C</label>
          <input type="file" id="imagenC" onChange={(e) => handleFileChange(e, setImagenC, setImagenCUrl)} />
          <input type="url" value={imagenCUrl} onChange={(e) => handleUrlChange(e, setImagenCUrl, setImagenC)} placeholder="Or paste image URL" />
          {imagenCUrl && <img src={imagenCUrl} alt="Current Secondary C" className="image-preview" />}
        </div>
        {}
        <VariationManager
          productId={prodId} 
          variations={variaciones}
          setVariations={setVariaciones}
        />
        <div className="button-group">
          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Product'}
          </button>
          <button type="button" onClick={handleRemoveProduct} className="delete-button">
            Delete Product
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;