// src/components/UserDetailModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { getUsersOrders } from '../../services/orderService';
import LoaderSpinner from '../utils/LoaderSpinner';

const UserDetailModal = ({ user, isOpen, onClose }) => {
    const modalRef = useRef();
    const [userOrders, setUserOrders] = useState([]);
    const [score, setScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const formatPrice = (price) => {
      if (price !== null && price !== undefined) {
          return `$${price.toFixed(2)}`;
      }
      return '$0.00';
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    useEffect(() => {
        if (!isOpen || !user) {
            setUserOrders([]);
            setScore(0);
            return;
        }

        const fetchUserOrders = async () => {
            setIsLoading(true);
            try {
                const { orders, score } = await getUsersOrders(user.uid);
                setUserOrders(orders);
                setScore(score);
            } catch (error) {
                console.error("Failed to fetch user orders:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserOrders();

    }, [isOpen, user]);

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
    }, [isOpen]);


    if (!isOpen) return null;

    const avatarUrl = user.photoURL || `https://placehold.co/70x70/E0E0E0/7F8C8D?text=${user.nombre.charAt(0)}`;

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
                            <p className="user-modal-score">Puntos: {score}</p>
                        </div>
                    </div>

                    <div className="orders-section">
                        <h4>Historial de Compras</h4>
                        {isLoading ? (
                            <LoaderSpinner />
                        ) : userOrders.length > 0 ? (
                            <div className="order-list">
                                {userOrders.map(order => (
                                    <div key={order.id} className="order-item">
                                        <div className="order-details">
                                            <span className="order-date">{order.fecha}</span>
                                            <p className="order-id">Pedido #{order.id.substring(0, 8)}</p>
                                        </div>
                                        <div className="order-total">
                                            Total: {formatPrice(order.total)}
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
