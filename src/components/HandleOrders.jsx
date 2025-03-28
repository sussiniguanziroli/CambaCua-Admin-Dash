import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Swal from 'sweetalert2';

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Obtener pedidos activos
    useEffect(() => {
        const fetchPedidos = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'pedidos'));
                const pedidosList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    fecha: doc.data().fecha?.toDate()
                }));
                setPedidos(pedidosList);
            } catch (error) {
                console.error("Error obteniendo pedidos:", error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudieron cargar los pedidos',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchPedidos();
    }, []);

    // Función para mover pedido a completados
    const moverPedido = async (pedido, estado) => {
        const { isConfirmed } = await Swal.fire({
            title: `¿${estado} pedido?`,
            text: `¿Marcar el pedido #${pedido.id.substring(0, 8)} como ${estado.toLowerCase()}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Sí, ${estado.toLowerCase()}`,
            cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return;

        try {
            // 1. Mover a pedidos_completados manteniendo el mismo ID
            await setDoc(doc(db, 'pedidos_completados', pedido.id), {
                ...pedido,
                estado: estado,
                fechaCompletado: new Date()
            });

            // 2. Eliminar de pedidos
            await deleteDoc(doc(db, 'pedidos', pedido.id));

            // 3. Actualizar estado local
            setPedidos(prev => prev.filter(p => p.id !== pedido.id));

            Swal.fire({
                title: '¡Éxito!',
                text: `Pedido marcado como ${estado.toLowerCase()}`,
                icon: 'success',
                confirmButtonText: 'Entendido'
            });
        } catch (error) {
            console.error("Error moviendo pedido:", error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo completar la operación',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    };

    // Función para actualizar estado
    const actualizarEstado = async (id, nuevoEstado) => {
        const estadoText = {
            'Pagado': 'marcar como pagado',
            'Cancelado': 'cancelar'
        }[nuevoEstado];

        const { isConfirmed } = await Swal.fire({
            title: `¿${nuevoEstado}?`,
            text: `¿Estás seguro que deseas ${estadoText} este pedido?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `Sí, ${estadoText}`,
            cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return;

        try {
            const pedidoRef = doc(db, 'pedidos', id);
            await updateDoc(pedidoRef, { estado: nuevoEstado });
            
            setPedidos(prevPedidos =>
                prevPedidos.map(pedido => 
                    pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido
                )
            );

            if (nuevoEstado === 'Cancelado') {
                const pedido = pedidos.find(p => p.id === id);
                await moverPedido(pedido, 'Cancelado');
            } else {
                Swal.fire({
                    title: '¡Éxito!',
                    text: `Estado actualizado a: ${nuevoEstado}`,
                    icon: 'success',
                    confirmButtonText: 'Entendido'
                });
            }
        } catch (error) {
            console.error("Error actualizando estado:", error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo actualizar el estado',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    };

    return (
        <div className="pedidos-container">
            <h2>Pedidos Activos</h2>
            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Cargando pedidos...</p>
                </div>
            ) : pedidos.length === 0 ? (
                <p className="no-orders">No hay pedidos pendientes.</p>
            ) : (
                <div className="grid-container">
                    {pedidos.map(pedido => (
                        <div key={pedido.id} className={`pedido-box ${pedido.estado.toLowerCase()}`}>
                            <div className="pedido-header">
                                <h3>Pedido #{pedido.id.substring(0, 8)}</h3>
                                <span className={`status-badge ${pedido.estado.toLowerCase()}`}>
                                    {pedido.estado}
                                </span>
                            </div>
                            
                            <div className="cliente-info">
                                <p><strong>Cliente:</strong> {pedido.nombre}</p>
                                <p><strong>Email:</strong> {pedido.email}</p>
                                <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                                <p><strong>Dirección:</strong> {pedido.direccion}</p>
                                <p><strong>DNI:</strong> {pedido.dni}</p>
                            </div>

                            <div className="pedido-details">
                                <p><strong>Fecha:</strong> {pedido.fecha?.toLocaleString('es-AR') || 'No disponible'}</p>
                                <p><strong>Total:</strong> ${pedido.total.toLocaleString('es-AR')}</p>
                                <p><strong>Método de pago:</strong> {pedido.metodoPago || 'No especificado'}</p>
                            </div>

                            <div className="productos-list">
                                <h4>Productos:</h4>
                                <ul>
                                    {pedido.productos?.map((producto, index) => (
                                        <li key={index}>
                                            <strong>{producto.nombre}</strong> - 
                                            Cantidad: {producto.cantidad} - 
                                            Precio: ${producto.precio.toLocaleString('es-AR')}
                                            {producto.talle && <span> - Talle: {producto.talle}</span>}
                                            {producto.color && <span> - Color: {producto.color}</span>}
                                        </li>
                                    )) || <li>No hay productos registrados</li>}
                                </ul>
                            </div>

                            <div className="pedido-actions">
                                <button 
                                    className="btn-cancelar"
                                    onClick={() => actualizarEstado(pedido.id, 'Cancelado')}
                                    disabled={pedido.estado === 'Cancelado'}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    className="btn-pagado"
                                    onClick={() => actualizarEstado(pedido.id, 'Pagado')}
                                    disabled={pedido.estado === 'Pagado'}
                                >
                                    Marcar como Pagado
                                </button>
                                <button 
                                    className="btn-completar"
                                    onClick={() => moverPedido(pedido, 'Completado')}
                                >
                                    Completar/Enviar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HandleOrders;