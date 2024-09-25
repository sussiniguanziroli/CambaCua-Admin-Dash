import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Asegúrate de importar correctamente tu configuración de Firebase

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [viewCompleted, setViewCompleted] = useState(false); // Permite ver completados o no

    // Fetch orders based on viewCompleted state
    useEffect(() => {
        const fetchPedidos = async () => {
            const pedidosCollection = collection(db, 'pedidos');
            const pedidosSnapshot = await getDocs(pedidosCollection);
            const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPedidos(pedidosList);
        };

        fetchPedidos();
    }, []);

    // Cancel order
    const cancelarPedido = async (id) => {
        try {
            const pedidoRef = doc(db, 'pedidos', id);
            await updateDoc(pedidoRef, { estado: 'cancelado' });  // Cambiar el estado del pedido a "cancelado"
            alert('Pedido cancelado');
            setPedidos(pedidos.map(pedido => pedido.id === id ? { ...pedido, estado: 'cancelado' } : pedido));
        } catch (error) {
            console.error('Error al cancelar el pedido:', error);
        }
    };

    // Mark order as finished
    const marcarComoFinalizado = async (id) => {
        try {
            const pedidoRef = doc(db, 'pedidos', id);
            await updateDoc(pedidoRef, { estado: 'finalizado' });  // Cambiar el estado a "finalizado"
            alert('Pedido marcado como finalizado');
            setPedidos(pedidos.map(pedido => pedido.id === id ? { ...pedido, estado: 'finalizado' } : pedido));
        } catch (error) {
            console.error('Error al marcar el pedido como finalizado:', error);
        }
    };

    // Archive the order manually
    const archivarPedido = async (id) => {
        try {
            const pedidoRef = doc(db, 'pedidos', id);
            await updateDoc(pedidoRef, { estado: 'archivado' });  // Cambiar estado a "archivado"
            alert('Pedido archivado');
            setPedidos(pedidos.map(pedido => pedido.id === id ? { ...pedido, estado: 'archivado' } : pedido));
        } catch (error) {
            console.error('Error al archivar el pedido:', error);
        }
    };

    // Toggle between viewing current orders and completed orders
    const toggleCompletados = () => {
        setViewCompleted(!viewCompleted);
    };

    return (
        <div>
            <h2>{viewCompleted ? 'Pedidos Finalizados/Archivados' : 'Pedidos Actuales'}</h2>
            <button onClick={toggleCompletados}>
                {viewCompleted ? 'Ver Pedidos Actuales' : 'Ver Pedidos Finalizados/Archivados'}
            </button>
            <div>
                {pedidos.length === 0 ? (
                    <p>No hay pedidos disponibles.</p>
                ) : (
                    <div>
                        {pedidos
                            .filter(pedido => viewCompleted 
                                ? ['finalizado', 'archivado'].includes(pedido.estado) 
                                : !['finalizado', 'archivado', 'cancelado'].includes(pedido.estado))
                            .map(pedido => (
                                <div key={pedido.id} className="pedido-item">
                                    <h3>Pedido de {pedido.nombre}</h3>
                                    <p>Dirección: {pedido.direccion}</p>
                                    <p>Estado: {pedido.estado}</p>
                                    <p>Email: {pedido.email}</p>
                                    <p>DNI: {pedido.dni}</p>
                                    <p>Teléfono: {pedido.telefono}</p>
                                    {pedido.fecha ? (
                                        <p>Fecha: {pedido.fecha.toDate().toLocaleString()}</p>
                                    ) : (
                                        <p>Fecha: No disponible</p>
                                    )}
                                    <p>Total: <strong>${pedido.total}</strong></p>
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

                                    {/* Mostrar botones según el estado actual */}
                                    {pedido.estado === 'pendiente' && (
                                        <>
                                            <button onClick={() => marcarComoFinalizado(pedido.id)}>Marcar como Finalizado</button>
                                            <button onClick={() => cancelarPedido(pedido.id)}>Cancelar Pedido</button>
                                        </>
                                    )}

                                    {pedido.estado === 'finalizado' && (
                                        <button onClick={() => archivarPedido(pedido.id)}>Archivar Pedido</button>
                                    )}

                                    {pedido.estado === 'archivado' && (
                                        <button onClick={() => alert('Pedido ya archivado, no se puede modificar.')}>Pedido Archivado</button>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HandleOrders;
