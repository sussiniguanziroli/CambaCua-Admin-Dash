/*
  File: PedidosCompletados.jsx
  Description: Admin panel for viewing completed and canceled orders.
  Status: FEATURE ADDED. Admins can now filter the order history by product name.
*/
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';

const PedidosCompletados = () => {
    const [pedidos, setPedidos] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState(''); // New state for product filter
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPedidos = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'pedidos_completados'));
                const pedidosList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id, ...data,
                        fechaOrden: data.fechaCancelacion?.toDate() || data.fechaCompletado?.toDate(),
                        fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
                        fechaCompletado: data.fechaCompletado?.toDate(),
                        fechaCancelacion: data.fechaCancelacion?.toDate()
                    };
                });
                const pedidosOrdenados = pedidosList.sort((a, b) => (b.fechaOrden || 0) - (a.fechaOrden || 0));
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

    useEffect(() => {
        let result = [...pedidos];
        
        // Filter by user details
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p => (p.nombre?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term) || p.dni?.toString().includes(term) || p.id.toLowerCase().includes(term)));
        }

        // Filter by product name
        if (productSearchTerm) {
            const productTerm = productSearchTerm.toLowerCase();
            result = result.filter(p => 
                p.productos.some(producto => 
                    producto.name?.toLowerCase().includes(productTerm)
                )
            );
        }

        if (minPrice) result = result.filter(p => (p.totalConDescuento ?? p.total) >= Number(minPrice));
        if (maxPrice) result = result.filter(p => (p.totalConDescuento ?? p.total) <= Number(maxPrice));
        if (startDate) result = result.filter(p => (p.fechaOrden && p.fechaOrden >= startDate));
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(p => (p.fechaOrden && p.fechaOrden <= endOfDay));
        }
        setFilteredPedidos(result);
    }, [pedidos, searchTerm, productSearchTerm, minPrice, maxPrice, startDate, endDate]);
    
    const resetFilters = () => {
        setSearchTerm('');
        setProductSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setStartDate(null);
        setEndDate(null);
    };

    const formatCancelationInfo = (pedido) => {
        if (pedido.estado === 'Cancelado' && pedido.fechaCancelacion) {
            const cancelationDate = pedido.fechaCancelacion.toLocaleString('es-AR');
            const canceledBy = pedido.canceladoPor === 'cliente' ? 'por el cliente' : 'por el admin';
            return `Cancelado ${canceledBy} el ${cancelationDate}`;
        }
        return pedido.fechaCompletado?.toLocaleString('es-AR') || 'No disponible';
    };

    return (
        <div className="pedidos-container">
            <h2>Historial de Pedidos</h2>
            <div className="filtros-container">
                <div className="filtro-group">
                    <label>Buscar por Cliente:</label>
                    <input type="text" placeholder="Nombre, email, DNI o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="filtro-group">
                    <label>Buscar por Producto:</label>
                    <input type="text" placeholder="Nombre del producto..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} />
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
                        <DatePicker selected={startDate} onChange={date => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} placeholderText="Fecha inicio" dateFormat="dd/MM/yyyy" />
                        <span>a</span>
                        <DatePicker selected={endDate} onChange={date => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="Fecha fin" dateFormat="dd/MM/yyyy" />
                    </div>
                </div>
                <button onClick={resetFilters} className="btn-reset">Limpiar Filtros</button>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner"></div><p>Cargando pedidos...</p></div>
            ) : filteredPedidos.length === 0 ? (
                <p className="no-orders">No hay pedidos que coincidan con los filtros.</p>
            ) : (
                <div className="grid-container">
                    {filteredPedidos.map(pedido => (
                        <div key={pedido.id} className={`pedido-box ${pedido.estado.toLowerCase()} ${pedido.canceladoPor === 'cliente' ? 'cancelado-cliente' : ''}`}>
                            <div className="pedido-header">
                                <h3>Pedido #{pedido.id}</h3>
                                <span className={`status-badge ${pedido.estado.toLowerCase()}`}>{pedido.estado} {pedido.canceladoPor === 'cliente' && '(Cliente)'}</span>
                            </div>

                            <div className="cliente-info">
                                <p><strong>Cliente:</strong> {pedido.nombre}</p>
                                <p><strong>Email:</strong> {pedido.email}</p>
                                <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                                <p><strong>Dirección:</strong> {pedido.direccion}</p>
                            </div>

                            <div className="pedido-details">
                                <p><strong>Fecha pedido:</strong> {pedido.fecha?.toLocaleString('es-AR') || 'N/A'}</p>
                                <p><strong>Fecha finalización:</strong> {formatCancelationInfo(pedido)}</p>
                                <p><strong>Subtotal:</strong> ${pedido.total.toLocaleString('es-AR')}</p>
                                {pedido.puntosDescontados > 0 && <p className="discount-detail"><strong>Descuento Puntos:</strong> -${pedido.puntosDescontados.toLocaleString('es-AR')}</p>}
                                <p><strong>Total Final:</strong> ${(pedido.totalConDescuento ?? pedido.total).toLocaleString('es-AR')}</p>
                                {pedido.costoEnvio > 0 && <p><strong>Costo Envío:</strong> ${pedido.costoEnvio.toLocaleString('es-AR')}</p>}
                                {pedido.motivoCancelacion && (<p className="cancelation-reason"><strong>Motivo:</strong> {pedido.motivoCancelacion}</p>)}
                            </div>

                            <div className="productos-list">
                                <h4>Productos:</h4>
                                <ul>
                                    {pedido.productos?.map((producto) => (
                                        <li key={producto.id + (producto.variationId || '')}>
                                            <strong>{producto.name || producto.nombre}</strong> - Cant: {producto.quantity || producto.cantidad}
                                        </li>
                                    )) || <li>No hay productos.</li>}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PedidosCompletados;
