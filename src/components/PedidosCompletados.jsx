import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';

const PedidosCompletados = () => {
    const [pedidos, setPedidos] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch completed orders
    useEffect(() => {
        const fetchPedidos = async () => {
            setLoading(true);
            try {
                const pedidosQuery = query(
                    collection(db, 'pedidos_completados')
                );
                const querySnapshot = await getDocs(pedidosQuery);

                const pedidosList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        fechaOrden: data.fechaCancelacion?.toDate() || data.fechaCompletado?.toDate(),
                        fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
                        fechaCompletado: data.fechaCompletado?.toDate(),
                        fechaCancelacion: data.fechaCancelacion?.toDate()
                    };
                });

                const pedidosOrdenados = pedidosList.sort((a, b) => {
                    if (!a.fechaOrden && !b.fechaOrden) return 0;
                    if (!a.fechaOrden) return 1;
                    if (!b.fechaOrden) return -1;
                    return b.fechaOrden - a.fechaOrden;
                });

                setPedidos(pedidosOrdenados);
                setFilteredPedidos(pedidosOrdenados);
            } catch (error) {
                console.error("Error fetching orders:", error);
                Swal.fire('Error', 'No se pudieron cargar los pedidos completados', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchPedidos();
    }, []);

    // Apply filters
    useEffect(() => {
        let result = [...pedidos];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(pedido =>
            (pedido.nombre?.toLowerCase().includes(term) ||
                pedido.email?.toLowerCase().includes(term) ||
                pedido.dni?.toString().includes(term) ||
                pedido.id.toLowerCase().includes(term))
            );
        }

        if (minPrice) result = result.filter(pedido => pedido.total >= Number(minPrice));
        if (maxPrice) result = result.filter(pedido => pedido.total <= Number(maxPrice));

        if (startDate) result = result.filter(pedido =>
            (pedido.fechaOrden && pedido.fechaOrden >= startDate)
        );

        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(pedido =>
                (pedido.fechaOrden && pedido.fechaOrden <= endOfDay)
            );
        }

        setFilteredPedidos(result);
    }, [pedidos, searchTerm, minPrice, maxPrice, startDate, endDate]);

    // Function to move an order back to pending
    const devolverPedido = async (pedido) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Devolver pedido?',
            text: `¿Quieres devolver el pedido #${pedido.id.substring(0, 8)} a pendientes?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, devolver',
            cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return;

        try {
            await setDoc(doc(db, 'pedidos', pedido.id), {
                ...pedido,
                estado: 'Pendiente',
                fechaCompletado: null,
                fechaCancelacion: null,
                canceladoPor: null,
                motivoCancelacion: null
            });

            await deleteDoc(doc(db, 'pedidos_completados', pedido.id));
            
            setPedidos(prev => prev.filter(p => p.id !== pedido.id));

            Swal.fire('¡Éxito!', 'Pedido devuelto a pendientes', 'success');
        } catch (error) {
            console.error("Error returning order:", error);
            Swal.fire('Error', 'No se pudo devolver el pedido', 'error');
        }
    };
    
    // Reset filters
    const resetFilters = () => {
        setSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setStartDate(null);
        setEndDate(null);
    };

    const formatCancelationInfo = (pedido) => {
        if (pedido.estado === 'Cancelado' && pedido.fechaCancelacion) {
            const cancelationDate = pedido.fechaCancelacion.toLocaleString('es-AR');
            const canceledBy = pedido.canceladoPor === 'cliente' ? 'por el cliente' : 'por el sistema';
            return `Cancelado ${canceledBy} el ${cancelationDate}`;
        }
        return pedido.fechaCompletado?.toLocaleString('es-AR') || 'No disponible';
    };

    return (
        <div className="pedidos-container">
            <h2>Historial de Pedidos</h2>

            <div className="filtros-container">
                 <div className="filtro-group">
                    <label>Buscar (nombre, email, DNI o ID):</label>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filtro-group">
                    <label>Rango de precios:</label>
                    <div className="price-range">
                        <input type="number" placeholder="Mínimo" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                        <span>a</span>
                        <input type="number" placeholder="Máximo" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                    </div>
                </div>
                <div className="filtro-group">
                    <label>Rango de fechas:</label>
                    <div className="date-range">
                        <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} placeholderText="Fecha inicio" dateFormat="dd/MM/yyyy" />
                        <span>a</span>
                        <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="Fecha fin" dateFormat="dd/MM/yyyy" />
                    </div>
                </div>
                <button onClick={resetFilters} className="btn-reset">Limpiar Filtros</button>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Cargando pedidos...</p>
                </div>
            ) : filteredPedidos.length === 0 ? (
                <p className="no-orders">No hay pedidos que coincidan con los filtros.</p>
            ) : (
                <div className="grid-container">
                    {filteredPedidos.map(pedido => (
                        <div key={pedido.id} className={`pedido-box ${pedido.estado.toLowerCase()} ${pedido.canceladoPor === 'cliente' ? 'cancelado-cliente' : ''}`}>
                            <div className="pedido-header">
                                <h3>Pedido #{pedido.id}</h3>
                                <span className={`status-badge ${pedido.estado.toLowerCase()} ${pedido.canceladoPor === 'cliente' ? 'cancelado-cliente' : ''}`}>
                                    {pedido.estado} {pedido.canceladoPor === 'cliente' && '(Cliente)'}
                                </span>
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
                                <p><strong>Fecha pedido:</strong> {pedido.fecha?.toLocaleString('es-AR') || 'No disponible'}</p>
                                <p><strong>Fecha finalización:</strong> {formatCancelationInfo(pedido)}</p>
                                <p><strong>Total Productos:</strong> ${pedido.total.toLocaleString('es-AR')}</p>
                                {pedido.costoEnvio > 0 && <p><strong>Costo Envío:</strong> ${pedido.costoEnvio.toLocaleString('es-AR')}</p>}
                                <p><strong>Método pago:</strong> {pedido.metodoPago || 'No especificado'}</p>
                                {pedido.motivoCancelacion && (
                                    <p className="cancelation-reason">
                                        <strong>Motivo cancelación:</strong> {pedido.motivoCancelacion}
                                    </p>
                                )}
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

                            {pedido.estado !== 'Completado' && pedido.estado !== 'Cancelado' && (
                                 <div className="pedido-actions">
                                     <button className="btn-desarchivar" onClick={() => devolverPedido(pedido)}>
                                         Devolver a Pendientes
                                     </button>
                                 </div>
                             )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PedidosCompletados;
