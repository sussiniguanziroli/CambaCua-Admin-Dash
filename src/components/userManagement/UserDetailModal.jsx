/*
  File: UserDetailModal.jsx
  Description: Admin modal for viewing and managing user details.
  Status: UPGRADED. Modal is now larger, includes a point management system,
          and displays a more detailed order history with corrected data fetching.
*/
import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaGift, FaPlusCircle, FaMinusCircle } from 'react-icons/fa';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Swal from 'sweetalert2';
import LoaderSpinner from '../utils/LoaderSpinner';

const UserDetailModal = ({ user, isOpen, onClose }) => {
    const modalRef = useRef();
    const [userOrders, setUserOrders] = useState([]);
    const [score, setScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [pointsToAdd, setPointsToAdd] = useState('');

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

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Fetch score from users/{uid}
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setScore(userSnap.data().score || 0);
                }

                // Fetch orders from both collections
                const q1 = query(collection(db, "pedidos"), where("userId", "==", user.uid));
                const q2 = query(collection(db, "pedidos_completados"), where("userId", "==", user.uid));
                const [pedidosSnap, completadosSnap] = await Promise.all([getDocs(q1), getDocs(q2)]);
                
                const fetchedOrders = [];
                pedidosSnap.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() }));
                completadosSnap.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() }));

                // Sort orders by date
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
                setScore(prevScore => prevScore + points);
                setPointsToAdd('');
                Swal.fire('¡Éxito!', `Se han ${actionText === 'añadir' ? 'añadido' : 'quitado'} ${absPoints} puntos.`, 'success');
            } catch (error) {
                console.error("Error updating score:", error);
                Swal.fire('Error', 'No se pudo actualizar el puntaje.', 'error');
            }
        }
    };
    
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
                        <h4>Historial de Compras ({userOrders.length})</h4>
                        {isLoading ? (
                            <LoaderSpinner />
                        ) : userOrders.length > 0 ? (
                            <div className="order-list">
                                {userOrders.map(order => (
                                    <div key={order.id} className="order-item">
                                        <div className="order-info">
                                            <span className="order-date">{formatDate(order.fecha)}</span>
                                            <p className="order-id">Pedido #{order.id.substring(0, 8)}</p>
                                            <span className={`status-badge ${order.estado?.toLowerCase()}`}>{order.estado}</span>
                                        </div>
                                        <div className="order-pricing">
                                            <span className="order-total">Subtotal: {formatPrice(order.total)}</span>
                                            {order.puntosDescontados > 0 && (
                                                <span className="order-discount">Descuento: -{formatPrice(order.puntosDescontados)}</span>
                                            )}
                                            <span className="order-final-total">Total: {formatPrice(order.totalConDescuento ?? order.total)}</span>
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
