import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaTimes, FaGift, FaPlusCircle, FaMinusCircle, FaSearch, FaChevronDown, FaChevronUp, FaUserTag, FaTags, FaHandshake } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Swal from 'sweetalert2';
import LoaderSpinner from '../utils/LoaderSpinner';

const UserDetailModal = ({ user, isOpen, onClose, onUserUpdate }) => {
    const modalRef = useRef();
    const [userOrders, setUserOrders] = useState([]);
    const [score, setScore] = useState(0);
    const [role, setRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pointsToAdd, setPointsToAdd] = useState('');
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [expandedOrders, setExpandedOrders] = useState({});

    const formatPrice = (price) => {
        if (price !== null && price !== undefined) {
            return `$${price.toLocaleString('es-AR')}`;
        }
        return '$0.00';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const toggleOrderExpansion = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setScore(userSnap.data().score || 0);
                    setRole(userSnap.data().role || 'baseCustomer');
                }

                const q1 = query(collection(db, "pedidos"), where("userId", "==", user.uid));
                const q2 = query(collection(db, "pedidos_completados"), where("userId", "==", user.uid));
                const [pedidosSnap, completadosSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);
                
                const fetchedOrders = [];
                pedidosSnap.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() }));
                completadosSnap.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() }));

                fetchedOrders.sort((a, b) => (b.fecha?.toDate() || 0) - (a.fecha?.toDate() || 0));
                
                setUserOrders(fetchedOrders);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                Swal.fire('Error', 'No se pudieron cargar los datos del usuario.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        
        if (isOpen) {
            fetchUserData();
        }
    }, [isOpen, user]);

    const handleUpdateScore = async (amount) => {
        const points = parseInt(amount, 10);
        if (isNaN(points) || points === 0) {
            Swal.fire('Inválido', 'Por favor, ingrese un número de puntos válido y distinto de cero.', 'warning');
            return;
        }

        const actionText = points > 0 ? 'añadir' : 'quitar';
        const absPoints = Math.abs(points);

        const { isConfirmed } = await Swal.fire({
            title: `¿Confirmar cambio?`,
            text: `Estás a punto de ${actionText} ${absPoints} puntos a ${user.nombre}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${actionText} puntos`,
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    score: increment(points)
                });
                const newScore = score + points;
                setScore(newScore);
                onUserUpdate({ uid: user.uid, score: newScore });
                setPointsToAdd('');
                Swal.fire('¡Éxito!', `Se han ${actionText === 'añadir' ? 'añadido' : 'quitado'} ${absPoints} puntos.`, 'success');
            } catch (error) {
                console.error("Error updating score:", error);
                Swal.fire('Error', 'No se pudo actualizar el puntaje.', 'error');
            }
        }
    };

    const handleRoleChange = async (newRole) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Confirmar Cambio de Rol',
            text: `¿Estás seguro de que quieres cambiar el rol de ${user.nombre} a "${newRole}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar rol',
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { role: newRole });
                setRole(newRole);
                onUserUpdate({ uid: user.uid, role: newRole });
                Swal.fire('¡Actualizado!', 'El rol del usuario ha sido actualizado.', 'success');
            } catch (error) {
                console.error("Error updating user role:", error);
                Swal.fire('Error', 'No se pudo actualizar el rol del usuario.', 'error');
            }
        }
    };

    const filteredOrders = useMemo(() => {
        if (!orderSearchTerm) {
            return userOrders;
        }
        const lowercasedFilter = orderSearchTerm.toLowerCase();
        return userOrders.filter(order => 
            order.productos.some(product => 
                product.name.toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [userOrders, orderSearchTerm]);
    
    const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    const avatarUrl = user.photoURL || `https://placehold.co/80x80/E0E0E0/7F8C8D?text=${user.nombre.charAt(0)}`;

    return (
        <div className={`user-modal-overlay ${isOpen ? 'open' : ''}`}>
            <div className="user-modal" ref={modalRef}>
                <button className="user-modal-close-btn" onClick={onClose}>
                    <FaTimes />
                </button>
                <div className="user-modal-content">
                    <h3 className="user-modal-title">Detalles del Usuario</h3>

                    <div className="user-info-section">
                        <img src={avatarUrl} alt={user.nombre} className="user-modal-avatar" />
                        <div className="user-modal-details">
                            <p className="user-modal-name">{user.nombre}</p>
                            <p className="user-modal-email">{user.email}</p>
                            <p className="user-modal-score"><FaGift /> Puntos: {score}</p>
                        </div>
                    </div>

                    <div className="role-management-section">
                        <h4><FaUserTag /> Rol del Usuario</h4>
                        <div className="role-display">
                            <span>Rol Actual:</span>
                            <span className={`role-badge ${role}`}>{role === 'convenioCustomer' ? 'Convenio' : 'Cliente Base'}</span>
                        </div>
                        <div className="role-actions">
                            {role !== 'convenioCustomer' ? (
                                <button className="role-change-btn assign" onClick={() => handleRoleChange('convenioCustomer')}>
                                    Asignar Rol Convenio
                                </button>
                            ) : (
                                <button className="role-change-btn revoke" onClick={() => handleRoleChange('baseCustomer')}>
                                    Revocar Rol Convenio
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="points-management-section">
                        <h4>Gestionar Puntos</h4>
                        <div className="points-input-group">
                            <input
                                type="number"
                                value={pointsToAdd}
                                onChange={(e) => setPointsToAdd(e.target.value)}
                                placeholder="Cantidad de puntos"
                            />
                            <button className="add-points-btn" onClick={() => handleUpdateScore(Number(pointsToAdd))}>
                                <FaPlusCircle /> Añadir
                            </button>
                            <button className="remove-points-btn" onClick={() => handleUpdateScore(-Number(pointsToAdd))}>
                                <FaMinusCircle /> Quitar
                            </button>
                        </div>
                    </div>

                    <div className="orders-section">
                        <div className="orders-header">
                            <h4>Historial de Compras ({filteredOrders.length})</h4>
                            <div className="order-search-box">
                                <FaSearch />
                                <input 
                                    type="text"
                                    placeholder="Filtrar por producto..."
                                    value={orderSearchTerm}
                                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        {isLoading ? (
                            <LoaderSpinner />
                        ) : userOrders.length > 0 ? (
                            <div className="order-list">
                                {filteredOrders.map(order => (
                                    <div key={order.id} className="order-item-detailed">
                                        <div className="order-summary-line" onClick={() => toggleOrderExpansion(order.id)}>
                                            <div className="order-info">
                                                <span className="order-date">{formatDate(order.fecha)}</span>
                                                <p className="order-id">Pedido #{order.id.substring(0, 8)}</p>
                                                <span className={`status-badge ${order.estado?.toLowerCase()}`}>{order.estado}</span>
                                            </div>
                                            <div className="order-pricing">
                                                <span className="order-final-total">Total: {formatPrice(order.total)}</span>
                                            </div>
                                            <button className="expand-order-btn">
                                                {expandedOrders[order.id] ? <FaChevronUp /> : <FaChevronDown />}
                                            </button>
                                        </div>
                                        <div className={`order-products-detailed ${expandedOrders[order.id] ? 'expanded' : ''}`}>
                                            {order.productos.map(product => (
                                                <div key={product.id + (product.variationId || '')} className="product-line">
                                                    <img src={product.imageUrl} alt={product.name} />
                                                    <div className="product-details">
                                                        <p className="product-name">{product.name}</p>
                                                        {product.attributes && <p className="product-attributes">{Object.values(product.attributes).join(' | ')}</p>}
                                                    </div>
                                                    <p className="product-quantity">x{product.quantity}</p>
                                                    <p className="product-price">{formatPrice(product.price)}</p>
                                                </div>
                                            ))}
                                            <div className="order-financial-summary">
                                                <span className="order-subtotal">Subtotal: {formatPrice(order.subtotalBruto)}</span>
                                                {order.descuentoPromociones > 0 && (
                                                    <span className="order-discount promo"><FaTags /> Promos: -{formatPrice(order.descuentoPromociones)}</span>
                                                )}
                                                {order.descuentoConvenio > 0 && (
                                                    <span className="order-discount convenio"><FaHandshake /> Convenio: -{formatPrice(order.descuentoConvenio)}</span>
                                                )}
                                                {order.puntosDescontados > 0 && (
                                                    <span className="order-discount points"><FaGift /> Puntos: -{formatPrice(order.puntosDescontados)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Este usuario aún no ha realizado compras.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetailModal;
