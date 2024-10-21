import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Configuración de Firebase

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);

    // Obtener pedidos de Firebase
    useEffect(() => {
        const fetchPedidos = async () => {
            const pedidosCollection = collection(db, 'pedidos');
            const pedidosSnapshot = await getDocs(pedidosCollection);
            const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPedidos(pedidosList);
        };

        fetchPedidos();
    }, []);

    // Función para actualizar el estado de un pedido
    const actualizarEstado = async (id, nuevoEstado) => {
        const pedidoRef = doc(db, 'pedidos', id);
        try {
            await updateDoc(pedidoRef, { estado: nuevoEstado });
            // Actualizar el estado local después de actualizar en Firebase
            setPedidos(prevPedidos =>
                prevPedidos.map(pedido => (pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido))
            );
            alert(`El estado del pedido ha sido actualizado a: ${nuevoEstado}`);
        } catch (error) {
            console.error('Error actualizando el estado del pedido:', error);
        }
    };

    return (
        <div>
            <h2>Mis Pedidos</h2>
            {pedidos.length === 0 ? (
                <p>No tienes pedidos actualmente.</p>
            ) : (
                <div className="grid-container">
                    {pedidos.map(pedido => (
                        <div key={pedido.id} className="pedido-box">
                            <h3>Pedido de: {pedido.nombre}</h3>
                            <p>Dirección: {pedido.direccion}</p>
                            <p>Email: {pedido.email}</p>
                            <p>DNI: {pedido.dni}</p>
                            <p>Teléfono: {pedido.telefono}</p>
                            {pedido.fecha ? (
                                <p>Fecha: {pedido.fecha.toDate().toLocaleString()}</p>
                            ) : (
                                <p>Fecha: No disponible</p>
                            )}
                            <p>Total: ${pedido.total}</p>
                            <p>Estado: {pedido.estado}</p>

                            <h4>Productos:</h4>
                            {pedido.productos && pedido.productos.length > 0 ? (
                                <ul>
                                    {pedido.productos.map((producto, index) => (
                                        <li key={index}>
                                            {producto.nombre} - Cantidad: {producto.cantidad} - Precio: ${producto.precio}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay productos en este pedido.</p>
                            )}

                            {/* Botones para cambiar el estado del pedido */}
                            <div className="pedido-actions">
                                <button onClick={() => actualizarEstado(pedido.id, 'Cancelado')}>Cancelar Pedido</button>
                                <button onClick={() => actualizarEstado(pedido.id, 'Pagado')}>Marcar como Pagado</button>
                                <button onClick={() => actualizarEstado(pedido.id, 'Completado')}>Marcar como Completado/Enviado</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HandleOrders;
