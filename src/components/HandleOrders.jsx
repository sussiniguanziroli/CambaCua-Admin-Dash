import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Swal from 'sweetalert2';
import { FaClock } from 'react-icons/fa';

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);

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
                
                pedidosList.sort((a, b) => {
                    if (a.programado && !b.programado) return -1;
                    if (!a.programado && b.programado) return 1;
                    return b.fecha - a.fecha;
                });

                setPedidos(pedidosList);
            } catch (error) {
                console.error("Error fetching orders:", error);
                Swal.fire('Error', 'No se pudieron cargar los pedidos', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchPedidos();
    }, []);

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
            await setDoc(doc(db, 'pedidos_completados', pedido.id), {
                ...pedido,
                estado: estado,
                fechaCompletado: new Date()
            });
            await deleteDoc(doc(db, 'pedidos', pedido.id));
            setPedidos(prev => prev.filter(p => p.id !== pedido.id));
            Swal.fire('¡Éxito!', `Pedido marcado como ${estado.toLowerCase()}`, 'success');
        } catch (error) {
            console.error("Error moving order:", error);
            Swal.fire('Error', 'No se pudo completar la operación', 'error');
        }
    };

    const actualizarEstado = async (id, nuevoEstado) => {
        const estadoText = {
            'Pagado': 'marcar como pagado',
            'Cancelado': 'cancelar',
            'Pendiente': 'marcar como pendiente'
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
            await updateDoc(pedidoRef, { 
                estado: nuevoEstado,
                ...(nuevoEstado === 'Pendiente' && { programado: false })
            });
            
            setPedidos(prevPedidos =>
                prevPedidos.map(pedido => 
                    pedido.id === id ? { ...pedido, estado: nuevoEstado, ...(nuevoEstado === 'Pendiente' && { programado: false }) } : pedido
                )
            );

            if (nuevoEstado === 'Cancelado') {
                const pedido = pedidos.find(p => p.id === id);
                await moverPedido(pedido, 'Cancelado');
            } else {
                Swal.fire('¡Éxito!', `Estado actualizado a: ${nuevoEstado}`, 'success');
            }
        } catch (error) {
            console.error("Error updating status:", error);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
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
                                <h3>Pedido #{pedido.id}</h3>
                                <div className="status-container">
                                    {pedido.programado && (
                                        <span className="scheduled-indicator" title="Pedido programado fuera de horario">
                                            <FaClock /> Programado
                                        </span>
                                    )}
                                    <span className={`status-badge ${pedido.estado.toLowerCase()}`}>
                                        {pedido.estado}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="cliente-info">
                                <p><strong>Cliente:</strong> {pedido.nombre}</p>
                                <p><strong>Email:</strong> {pedido.email}</p>
                                <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                                <p><strong>Dirección:</strong> {pedido.direccion}</p>
                                {pedido.indicaciones && <p><strong>Indicaciones:</strong> {pedido.indicaciones}</p>}
                                <p><strong>DNI:</strong> {pedido.dni}</p>
                            </div>

                            <div className="pedido-details">
                                <p><strong>Fecha:</strong> {pedido.fecha?.toLocaleString('es-AR') || 'No disponible'}</p>
                                <p><strong>Total Productos:</strong> ${pedido.total.toLocaleString('es-AR')}</p>
                                {pedido.costoEnvio > 0 && <p><strong>Costo Envío:</strong> ${pedido.costoEnvio.toLocaleString('es-AR')}</p>}
                                <p><strong>Método de pago:</strong> {pedido.metodoPago || 'No especificado'}</p>
                            </div>

                            <div className="productos-list">
                                <h4>Productos:</h4>
                                <ul>
                                    {pedido.productos?.map((producto) => (
                                        <li key={producto.id + (producto.variationId || '')}> {/* Unique key */}
                                            <strong>{producto.name || producto.nombre}</strong> - 
                                            Cantidad: {producto.quantity || producto.cantidad} - 
                                            Precio: ${ (producto.price || producto.precio)?.toLocaleString('es-AR')}
                                            {producto.hasVariations && producto.attributes && (
                                                <span>
                                                    {' ('}
                                                    {Object.entries(producto.attributes).map(([key, value]) => (
                                                        `${key}: ${value}`
                                                    )).join(', ')}
                                                    {')'}
                                                </span>
                                            )}
                                        </li>
                                    )) || <li>No hay productos registrados</li>}
                                </ul>
                            </div>

                            <div className="pedido-actions">
                                {pedido.estado === 'Programado' && (
                                    <button 
                                        className="btn-pendiente"
                                        onClick={() => actualizarEstado(pedido.id, 'Pendiente')}
                                    >
                                        Marcar como Pendiente
                                    </button>
                                )}
                                <button 
                                    className="btn-cancelar"
                                    onClick={() => actualizarEstado(pedido.id, 'Cancelado')}
                                    disabled={pedido.estado === 'Cancelado'}
                                >
                                    Cancelar
                                </button>
                                {/* The "Pagado" button is now conditional */}
                                {pedido.metodoPago !== 'Efectivo' && (
                                    <button 
                                        className="btn-pagado"
                                        onClick={() => actualizarEstado(pedido.id, 'Pagado')}
                                        disabled={pedido.estado === 'Pagado' || pedido.estado === 'Cancelado'}
                                    >
                                        Marcar como Pagado
                                    </button>
                                )}
                                <button 
                                    className="btn-completar"
                                    onClick={() => moverPedido(pedido, 'Completado')}
                                    disabled={pedido.estado === 'Cancelado'}
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
