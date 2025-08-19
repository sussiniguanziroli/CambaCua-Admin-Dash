import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Swal from 'sweetalert2';
import { FaClock, FaTags, FaGift } from 'react-icons/fa';

const HandleOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);

    const getPromoDescription = (item) => {
        if (!item.promocion) return null;
        switch (item.promocion.type) {
            case 'percentage_discount': return `${item.promocion.value}% OFF`;
            case '2x1': return `2x1`;
            case 'second_unit_discount': return `${item.promocion.value}% 2da U.`;
            default: return "Promo";
        }
    };

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
                    return (b.fecha || 0) - (a.fecha || 0);
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
            const pedidoRef = doc(db, 'pedidos', pedido.id);
            const completadoRef = doc(db, 'pedidos_completados', pedido.id);

            await setDoc(completadoRef, {
                ...pedido,
                estado: estado,
                fechaCompletado: new Date()
            });
            await deleteDoc(pedidoRef);
            
            setPedidos(prev => prev.filter(p => p.id !== pedido.id));
            Swal.fire('¡Éxito!', `Pedido marcado como ${estado.toLowerCase()}`, 'success');
        } catch (error) {
            console.error("Error moving order:", error);
            Swal.fire('Error', 'No se pudo completar la operación', 'error');
        }
    };

    const actualizarEstado = async (id, nuevoEstado) => {
        const pedido = pedidos.find(p => p.id === id);
        if (!pedido) return;

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
            const batch = writeBatch(db);
            const pedidoRef = doc(db, 'pedidos', id);

            batch.update(pedidoRef, { 
                estado: nuevoEstado,
                ...(nuevoEstado === 'Pendiente' && { programado: false })
            });

            if (nuevoEstado === 'Cancelado') {
                if (pedido.puntosDescontados > 0) {
                    const userRef = doc(db, 'users', pedido.userId);
                    batch.update(userRef, { score: increment(pedido.puntosDescontados) });
                }
                for (const item of pedido.productos) {
                    const productRef = doc(db, 'productos', item.id);
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        const productData = productSnap.data();
                        if (productData.hasVariations && item.variationId) {
                            const newVariationsList = productData.variationsList.map(v => v.id === item.variationId ? { ...v, stock: (v.stock || 0) + item.quantity } : v);
                            batch.update(productRef, { variationsList: newVariationsList });
                        } else {
                            batch.update(productRef, { stock: increment(item.quantity) });
                        }
                    }
                }
                const completadoRef = doc(db, 'pedidos_completados', id);
                batch.set(completadoRef, { ...pedido, estado: 'Cancelado', canceladoPor: 'admin', fechaCancelacion: new Date() });
                batch.delete(pedidoRef);
            }
            
            await batch.commit();

            if (nuevoEstado === 'Cancelado') {
                setPedidos(prev => prev.filter(p => p.id !== id));
                Swal.fire('¡Cancelado!', 'El pedido ha sido cancelado y el stock restaurado.', 'success');
            } else {
                setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado, ...(nuevoEstado === 'Pendiente' && { programado: false }) } : p));
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
                <div className="loading-spinner"><div className="spinner"></div><p>Cargando pedidos...</p></div>
            ) : pedidos.length === 0 ? (
                <p className="no-orders">No hay pedidos pendientes.</p>
            ) : (
                <div className="grid-container">
                    {pedidos.map(pedido => (
                        <div key={pedido.id} className={`pedido-box ${pedido.estado.toLowerCase()}`}>
                            <div className="pedido-header">
                                <h3>Pedido #{pedido.id.substring(0, 8)}...</h3>
                                <div className="status-container">
                                    {pedido.programado && (<span className="scheduled-indicator" title="Pedido programado"><FaClock /> Programado</span>)}
                                    <span className={`status-badge ${pedido.estado.toLowerCase()}`}>{pedido.estado}</span>
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
                                <p><strong>Fecha:</strong> {pedido.fecha?.toLocaleString('es-AR') || 'N/A'}</p>
                                <p><strong>Subtotal:</strong> ${pedido.subtotal?.toLocaleString('es-AR')}</p>
                                {pedido.descuentoPromociones > 0 && <p className="discount-detail promo-discount"><FaTags /><strong> Promociones:</strong> -${pedido.descuentoPromociones.toLocaleString('es-AR')}</p>}
                                {pedido.puntosDescontados > 0 && <p className="discount-detail points-discount"><FaGift /><strong> Puntos:</strong> -${pedido.puntosDescontados.toLocaleString('es-AR')}</p>}
                                <p className="final-total"><strong>Total Productos:</strong> ${ (pedido.totalConDescuento ?? pedido.total).toLocaleString('es-AR')}</p>
                                {pedido.costoEnvio > 0 && <p><strong>Costo Envío:</strong> ${pedido.costoEnvio.toLocaleString('es-AR')}</p>}
                                <p><strong>Método de pago:</strong> {pedido.metodoPago || 'N/A'}</p>
                            </div>

                            <div className="productos-list">
                                <h4>Productos:</h4>
                                <ul>
                                    {pedido.productos?.map((producto) => {
                                        const promoDesc = getPromoDescription(producto);
                                        return (
                                            <li key={producto.id + (producto.variationId || '')}>
                                                <div className="product-main-info">
                                                    <strong>{producto.name || producto.nombre}</strong>
                                                    {promoDesc && <span className="promo-badge-admin">{promoDesc}</span>}
                                                </div>
                                                <div className="product-sub-info">
                                                    <span>Cant: {producto.quantity || producto.cantidad}</span>
                                                    <span>Precio: ${ (producto.price || producto.precio)?.toLocaleString('es-AR')}</span>
                                                </div>
                                                {producto.hasVariations && producto.attributes && (<span className="product-variation-details">({Object.entries(producto.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})</span>)}
                                            </li>
                                        )
                                    }) || <li>No hay productos.</li>}
                                </ul>
                            </div>

                            <div className="pedido-actions">
                                {pedido.programado && (<button className="btn-pendiente" onClick={() => actualizarEstado(pedido.id, 'Pendiente')}>Marcar Pendiente</button>)}
                                <button className="btn-cancelar" onClick={() => actualizarEstado(pedido.id, 'Cancelado')} disabled={pedido.estado === 'Cancelado'}>Cancelar</button>
                                {pedido.metodoPago !== 'Efectivo' && (<button className="btn-pagado" onClick={() => actualizarEstado(pedido.id, 'Pagado')} disabled={pedido.estado === 'Pagado' || pedido.estado === 'Cancelado'}>Marcar Pagado</button>)}
                                <button className="btn-completar" onClick={() => moverPedido(pedido, 'Completado')} disabled={pedido.estado === 'Cancelado'}>Completar/Enviar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HandleOrders;
