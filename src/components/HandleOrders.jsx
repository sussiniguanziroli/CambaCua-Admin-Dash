import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Asegúrate de importar correctamente tu configuración de Firebase

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [archivados, setArchivados] = useState([]);
    const [viewArchived, setViewArchived] = useState(false);

    // Fetch orders based on viewArchived state
    useEffect(() => {
        const fetchPedidos = async () => {
            const pedidosCollection = viewArchived ? collection(db, 'archivo-pedidos') : collection(db, 'pedidos');
            const pedidosSnapshot = await getDocs(pedidosCollection);
            const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            viewArchived ? setArchivados(pedidosList) : setPedidos(pedidosList);
        };

        fetchPedidos();
    }, [viewArchived]);

    // Mark order as finished and archive it
    const marcarComoFinalizado = async (id) => {
        try {
            const pedidoRef = doc(db, 'pedidos', id);
            const pedidoDoc = await getDoc(pedidoRef);
            const pedidoData = pedidoDoc.data();

            if (pedidoData) {
                // Move the order to the archive collection
                await setDoc(doc(db, 'archivo-pedidos', id), pedidoData);
                // Remove the order from the current orders collection
                await deleteDoc(pedidoRef);
                alert('Pedido marcado como finalizado y archivado');
                setPedidos(pedidos.filter(pedido => pedido.id !== id));
            }
        } catch (error) {
            console.error('Error al marcar el pedido como finalizado:', error);
        }
    };

    // Delete archived order permanently
    const borrarPedidoArchivado = async (id) => {
        try {
            const pedidoRef = doc(db, 'archivo-pedidos', id);
            await deleteDoc(pedidoRef);
            alert('Pedido archivado borrado');
            setArchivados(archivados.filter(pedido => pedido.id !== id));
        } catch (error) {
            console.error('Error al borrar el pedido archivado:', error);
        }
    };

    // Unarchive an order and move it back to the current orders
    const desarchivarPedido = async (id) => {
        try {
            const pedidoRef = doc(db, 'archivo-pedidos', id);
            const pedidoDoc = await getDoc(pedidoRef);
            const pedidoData = pedidoDoc.data();

            if (pedidoData) {
                // Move the order back to the current orders collection
                await setDoc(doc(db, 'pedidos', id), pedidoData);
                // Remove the order from the archive collection
                await deleteDoc(pedidoRef);
                alert('Pedido desarchivado');
                setArchivados(archivados.filter(pedido => pedido.id !== id));
            }
        } catch (error) {
            console.error('Error al desarchivar el pedido:', error);
        }
    };

    // Toggle between viewing current orders and archived orders
    const toggleArchivados = () => {
        setViewArchived(!viewArchived);
    };

    return (
        <div>
            <h2>{viewArchived ? 'Pedidos Archivados' : 'Pedidos Actuales'}</h2>
            <button onClick={toggleArchivados}>
                {viewArchived ? 'Ver Pedidos Actuales' : 'Ver Pedidos Archivados'}
            </button>
            {viewArchived ? (
                <div>
                    {archivados.length === 0 ? (
                        <p>No hay pedidos archivados.</p>
                    ) : (
                        <div>
                            {archivados.map((pedido) => (
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
                                    <button onClick={() => desarchivarPedido(pedido.id)}>Desarchivar</button>
                                    <button onClick={() => borrarPedidoArchivado(pedido.id)}>Borrar</button>
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
