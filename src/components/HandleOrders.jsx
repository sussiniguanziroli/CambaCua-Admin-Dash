import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);

    // Obtener solo pedidos NO archivados
    useEffect(() => {
        const fetchPedidos = async () => {
            const pedidosCollection = collection(db, 'pedidos');
            const pedidosSnapshot = await getDocs(pedidosCollection);
            const pedidosList = pedidosSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(pedido => !pedido.archivado);
            setPedidos(pedidosList);
        };
        fetchPedidos();
    }, []);

    // Función para archivar pedido (marcar como completado)
    const archivarPedido = async (pedido) => {
        try {
            // 1. Actualizar el pedido original como "archivado"
            const pedidoRef = doc(db, 'pedidos', pedido.id);
            await updateDoc(pedidoRef, { 
                estado: 'Completado',
                archivado: true,
                fechaCompletado: new Date()
            });

            // 2. Crear una copia en "pedidos_completados"
            const pedidosCompletadosRef = collection(db, 'pedidos_completados');
            await addDoc(pedidosCompletadosRef, { 
                ...pedido,
                estado: 'Completado',
                fechaArchivado: new Date() 
            });

            // 3. Actualizar el estado local (eliminar de la lista)
            setPedidos(prevPedidos => prevPedidos.filter(p => p.id !== pedido.id));
            alert("¡Pedido completado y archivado!");
        } catch (error) {
            console.error("Error archivando el pedido:", error);
            alert("Error al archivar el pedido");
        }
    };

    // Función para otros estados (Pagado, Cancelado)
    const actualizarEstado = async (id, nuevoEstado) => {
        const pedidoRef = doc(db, 'pedidos', id);
        try {
            await updateDoc(pedidoRef, { estado: nuevoEstado });
            setPedidos(prevPedidos =>
                prevPedidos.map(pedido => 
                    pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido
                )
            );
            alert(`Estado actualizado a: ${nuevoEstado}`);
        } catch (error) {
            console.error("Error actualizando el estado:", error);
            alert("Error al actualizar el estado");
        }
    };

    return (
        <div className="pedidos-container">
            <h2>Pedidos Activos</h2>
            {pedidos.length === 0 ? (
                <p>No hay pedidos pendientes.</p>
            ) : (
                <div className="grid-container">
                    {pedidos.map(pedido => (
                        <div key={pedido.id} className="pedido-box">
                            <h3>Pedido de: {pedido.nombre}</h3>
                            <p><strong>Dirección:</strong> {pedido.direccion}</p>
                            <p><strong>Email:</strong> {pedido.email}</p>
                            <p><strong>DNI:</strong> {pedido.dni}</p>
                            <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                            {pedido.fecha ? (
                                <p><strong>Fecha:</strong> {pedido.fecha.toDate().toLocaleString()}</p>
                            ) : (
                                <p><strong>Fecha:</strong> No disponible</p>
                            )}
                            <p><strong>Total:</strong> ${pedido.total}</p>
                            <p><strong>Estado:</strong> {pedido.estado}</p>

                            <h4>Productos:</h4>
                            {pedido.productos && pedido.productos.length > 0 ? (
                                <ul className="productos-list">
                                    {pedido.productos.map((producto, index) => (
                                        <li key={index}>
                                            <strong>{producto.nombre}</strong> - 
                                            Cantidad: {producto.cantidad} - 
                                            Precio: ${producto.precio}
                                            {producto.talle && <span> - Talle: {producto.talle}</span>}
                                            {producto.color && <span> - Color: {producto.color}</span>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay productos en este pedido.</p>
                            )}

                            <div className="pedido-actions">
                                <button 
                                    className="btn-cancelar"
                                    onClick={() => actualizarEstado(pedido.id, 'Cancelado')}
                                >
                                    Cancelar Pedido
                                </button>
                                <button 
                                    className="btn-pagado"
                                    onClick={() => actualizarEstado(pedido.id, 'Pagado')}
                                >
                                    Marcar como Pagado
                                </button>
                                <button 
                                    className="btn-completar"
                                    onClick={() => archivarPedido(pedido)}
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
