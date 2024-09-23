import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Asegúrate de importar correctamente tu configuración de Firebase

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [completados, setCompletados] = useState([]);
    const [viewCompleted, setViewCompleted] = useState(false);

    // Fetch orders based on viewCompleted state
    useEffect(() => {
        const fetchPedidos = async () => {
            const pedidosCollection = viewCompleted ? collection(db, 'completados') : collection(db, 'pedidos');
            const pedidosSnapshot = await getDocs(pedidosCollection);
            const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            viewCompleted ? setCompletados(pedidosList) : setPedidos(pedidosList);
        };

        fetchPedidos();
    }, [viewCompleted]);

    // Mark order as finished and move it to the completed collection
    const marcarComoFinalizado = async (id) => {
        try {
            const pedidoRef = doc(db, 'pedidos', id);
            const pedidoDoc = await getDoc(pedidoRef);
            const pedidoData = pedidoDoc.data();

            if (pedidoData) {
                // Move the order to the completed collection
                await setDoc(doc(db, 'completados', id), pedidoData);
                // Remove the order from the current orders collection
                await deleteDoc(pedidoRef);
                alert('Pedido marcado como completado');
                setPedidos(pedidos.filter(pedido => pedido.id !== id));
            }
        } catch (error) {
            console.error('Error al marcar el pedido como completado:', error);
        }
    };

    // Delete completed order permanently
    const borrarPedidoCompletado = async (id) => {
        try {
            const pedidoRef = doc(db, 'completados', id);
            await deleteDoc(pedidoRef);
            alert('Pedido completado borrado');
            setCompletados(completados.filter(pedido => pedido.id !== id));
        } catch (error) {
            console.error('Error al borrar el pedido completado:', error);
        }
    };

    // Unarchive an order and move it back to the current orders
    const desarchivarPedido = async (id) => {
        try {
            const pedidoRef = doc(db, 'completados', id);
            const pedidoDoc = await getDoc(pedidoRef);
            const pedidoData = pedidoDoc.data();

            if (pedidoData) {
                // Move the order back to the current orders collection
                await setDoc(doc(db, 'pedidos', id), pedidoData);
                // Remove the order from the completed collection
                await deleteDoc(pedidoRef);
                alert('Pedido movido a pedidos actuales');
                setCompletados(completados.filter(pedido => pedido.id !== id));
            }
        } catch (error) {
            console.error('Error al mover el pedido a pedidos actuales:', error);
        }
    };

    // Toggle between viewing current orders and completed orders
    const toggleCompletados = () => {
        setViewCompleted(!viewCompleted);
    };

    return (
        <div>
            <h2>{viewCompleted ? 'Pedidos Completados' : 'Pedidos Actuales'}</h2>
            <button onClick={toggleCompletados}>
                {viewCompleted ? 'Ver Pedidos Actuales' : 'Ver Pedidos Completados'}
            </button>
            {viewCompleted ? (
                <div>
                    {completados.length === 0 ? (
                        <p>No hay pedidos completados.</p>
                    ) : (
                        <div>
                            {completados.map((pedido) => (
                                <div key={pedido.id} className="pedido-item">
                                    <h3>Pedido de {pedido.nombre}</h3>
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
                                    <button onClick={() => desarchivarPedido(pedido.id)}>Mover a Pedidos Actuales</button>
                                    <button onClick={() => borrarPedidoCompletado(pedido.id)}>Borrar</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {pedidos.length === 0 ? (
                        <p>No hay pedidos disponibles.</p>
                    ) : (
                        <div>
                            {pedidos.map((pedido) => (
                                <div key={pedido.id} className="pedido-item">
                                    <h3>Pedido de {pedido.nombre}</h3>
                                    <p>Dirección: {pedido.direccion}</p>
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
                                    <button onClick={() => marcarComoFinalizado(pedido.id)}>Marcar como Finalizado</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HandleOrders;
