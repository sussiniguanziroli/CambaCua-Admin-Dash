import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import Filtrado from './Filtrado';
import LoaderSpinner from './utils/LoaderSpinner';
import Swal from 'sweetalert2';
import AdminProductModal from './AdminProductModal'; // *** IMPORTAR EL MODAL ***
// Opcional: Iconos para botones si decides usarlos
// import { FaEdit, FaTrashAlt, FaToggleOn, FaToggleOff, FaEye } from 'react-icons/fa';

const ProductList = () => {
    const [productos, setProductos] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // *** ESTADO PARA EL MODAL ***
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProductForModal, setSelectedProductForModal] = useState(null);

    // Fetch inicial de productos
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const snapshot = await getDocs(collection(db, 'productos'));
                const productosData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setProductos(productosData);
                setFilteredProducts(productosData);
            } catch (err) {
                console.error('Error al obtener los productos: ', err);
                setError('No se pudieron cargar los productos. Inténtalo de nuevo más tarde.');
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Carga',
                    text: 'No se pudieron cargar los productos.',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Activar/Desactivar producto con confirmación para desactivar
    const toggleProductActive = async (producto) => {
        const productRef = doc(db, 'productos', producto.id);
        const newState = !producto.activo;
        const actionText = newState ? 'activar' : 'desactivar';
        const actionTitle = newState ? 'Activado' : 'Desactivado';

        // Confirmación solo si se va a DESACTIVAR
        if (!newState) {
            const confirmationResult = await Swal.fire({
                title: `¿Desactivar "${producto.nombre}"?`,
                text: "El producto no será visible para los clientes.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#FFB74D', // Color Warning
                cancelButtonColor: '#95a5a6',
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar'
            });

            if (!confirmationResult.isConfirmed) {
                return; // Cancelar si el usuario no confirma
            }
        }

        // Proceder con la actualización
        try {
            await updateDoc(productRef, { activo: newState });
            // Actualizar estado local optimista o volviendo a fetchear
            const updateList = list => list.map(p =>
                p.id === producto.id ? { ...p, activo: newState } : p
            );
            setProductos(updateList);
            setFilteredProducts(updateList);

            // Si el modal está abierto y es el producto editado, actualizarlo también
             if (isModalOpen && selectedProductForModal?.id === producto.id) {
                setSelectedProductForModal(prev => ({ ...prev, activo: newState }));
            }


            Swal.fire({
                icon: 'success',
                title: `Producto ${actionTitle}`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error(`Error al ${actionText} el producto:`, err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo ${actionText} el producto.`,
            });
        }
    };

    // Eliminar producto
    const deleteProduct = async (producto) => {
        const result = await Swal.fire({
            title: `¿Eliminar "${producto.nombre}"?`,
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E57373', // Color Error
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            // Cerrar modal si el producto a eliminar está abierto
            if (isModalOpen && selectedProductForModal?.id === producto.id) {
                closeProductModal();
            }

            try {
                const productRef = doc(db, 'productos', producto.id);
                await deleteDoc(productRef);

                // Actualizar estado local
                const filterList = list => list.filter(p => p.id !== producto.id);
                setProductos(filterList);
                setFilteredProducts(filterList);

                Swal.fire({
                    title: 'Eliminado',
                    text: `"${producto.nombre}" ha sido eliminado.`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error('Error al eliminar el producto:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `No se pudo eliminar el producto "${producto.nombre}".`,
                });
            }
        }
    };

    // Manejar filtros
    const handleFilter = ({ category, subcategory, text }) => {
        let filtered = productos;

        if (category) {
            filtered = filtered.filter(producto => producto.categoryAdress === category);
        }
        if (subcategory) {
            filtered = filtered.filter(producto => producto.subcategoria === subcategory);
        }
        if (text) {
            const lowerText = text.toLowerCase();
            filtered = filtered.filter(producto =>
                (producto.nombre && producto.nombre.toLowerCase().includes(lowerText)) ||
                (producto.categoryAdress && producto.categoryAdress.toLowerCase().includes(lowerText)) ||
                (producto.categoria && producto.categoria.toLowerCase().includes(lowerText)) ||
                (producto.subcategoria && producto.subcategoria.toLowerCase().includes(lowerText))
            );
        }
        setFilteredProducts(filtered);
    };

    // *** FUNCIONES PARA MANEJAR EL MODAL ***
    const openProductModal = (producto) => {
        setSelectedProductForModal(producto);
        setIsModalOpen(true);
    };

    const closeProductModal = () => {
        setIsModalOpen(false);
        // Pequeño delay antes de limpiar el producto para la animación de cierre
        setTimeout(() => {
             setSelectedProductForModal(null);
        }, 300); // Ajustar si la animación dura más/menos
    };

    //Renderizado principal

    return (
        <div className="product-list-container">
            <Filtrado onFilter={handleFilter} />

            {/* *** INDICADOR DE CARGA CON LOADER *** */}
            {isLoading && (
                <div className="loader-container">
                    <LoaderSpinner size="large" />
                    <h3>Cargando Listado</h3>
                </div>
            )}

            {/* Mensaje de error */}
            {error && !isLoading && <p className="error-message">{error}</p>}

            {/* Lista de productos */}
            {!isLoading && !error && (
                <div className="product-list">
                    {/* ... (mapeo de productos existente, sin cambios internos en el map) ... */}
                     {filteredProducts.length > 0 ? (
                        filteredProducts.map(producto => (
                             <div key={producto.id} className={`product-item ${!producto.activo ? 'inactive-item' : ''}`}>
                                {/* Status Badge */}
                                <span className={`product-status ${producto.activo ? 'active' : 'inactive'}`}>
                                    {producto.activo ? 'Activo' : 'Inactivo'}
                                </span>
                                {/* Nombre Clickable */}
                                <h3 onClick={() => openProductModal(producto)} style={{ cursor: 'pointer' }} title="Ver detalles">
                                    {producto.nombre}
                                </h3>
                                 {/* Imagen Clickable */}
                                <div className="product-image-container" onClick={() => openProductModal(producto)} style={{ cursor: 'pointer' }} title="Ver detalles">
                                    {producto.imagen ? <img src={producto.imagen} alt={producto.nombre} onError={(e) => e.target.src = 'https://via.placeholder.com/400?text=Sin+Imagen'}/> : <span className="no-image">Sin imagen</span>}
                                </div>
                                {/* Info básica */}
                                <p><strong>Precio:</strong> ${producto.precio ? producto.precio.toFixed(2) : 'N/A'}</p>
                                <p><strong>Stock:</strong> {producto.stock !== undefined ? producto.stock : 'N/A'}</p>
                                <p><strong>Categoría:</strong> {producto.categoria || 'N/A'}</p>
                                <p><strong>Subcategoría:</strong> {producto.subcategoria || 'N/A'}</p>
                                {/* Acciones */}
                                <div className="product-actions">
                                    <button
                                        className={`btn-toggle ${producto.activo ? 'btn-deactivate' : 'btn-activate'}`}
                                        onClick={() => toggleProductActive(producto)}
                                        title={producto.activo ? 'Desactivar producto' : 'Activar producto'}
                                    >
                                        {producto.activo ? 'Desactivar' : 'Activar'}
                                    </button>
                                    <Link to={`/admin/edit-product/${producto.id}`} className="btn-edit" title="Editar producto">
                                        Editar
                                    </Link>
                                    <button className="btn-delete" onClick={() => deleteProduct(producto)} title="Eliminar producto">
                                         Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-products">No se encontraron productos que coincidan con los filtros.</p>
                    )}
                </div>
            )}

            {/* Modal */}
            {selectedProductForModal && (
                <AdminProductModal
                    producto={selectedProductForModal}
                    isOpen={isModalOpen}
                    onClose={closeProductModal}
                />
            )}
        </div>
    );
};

export default ProductList;