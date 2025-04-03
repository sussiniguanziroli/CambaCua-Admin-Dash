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

    // Obtener pedidos completados
    useEffect(() => {
        const fetchPedidos = async () => {
            setLoading(true);
            try {
                // Cambiamos la consulta para no ordenar por fechaCompletado
                const pedidosQuery = query(
                    collection(db, 'pedidos_completados')
                );
                const querySnapshot = await getDocs(pedidosQuery);

                const pedidosList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        // Usamos fechaCancelacion si existe, sino fechaCompletado
                        fechaOrden: data.fechaCancelacion?.toDate() || data.fechaCompletado?.toDate(),
                        fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
                        fechaCompletado: data.fechaCompletado?.toDate(),
                        fechaCancelacion: data.fechaCancelacion?.toDate()
                    };
                });

                // Ordenamos localmente por fechaOrden (descendente)
                const pedidosOrdenados = pedidosList.sort((a, b) => {
                    if (!a.fechaOrden && !b.fechaOrden) return 0;
                    if (!a.fechaOrden) return 1;
                    if (!b.fechaOrden) return -1;
                    return b.fechaOrden - a.fechaOrden;
                });

                setPedidos(pedidosOrdenados);
                setFilteredPedidos(pedidosOrdenados);
            } catch (error) {
                console.error("Error obteniendo pedidos:", error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudieron cargar los pedidos completados',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
            } finally {
                setLoading(false);
            }
        };
        fetchPedidos();
    }, []);

    // Aplicar filtros
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

    // Función para devolver pedido a activos (solo si no fue cancelado por cliente)
    const devolverPedido = async (pedido) => {
        if (pedido.canceladoPor === 'cliente') {
            Swal.fire({
                title: 'No permitido',
                text: 'Los pedidos cancelados por el cliente no pueden ser reactivados',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }

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
            // 1. Mover de vuelta a pedidos manteniendo ID
            await setDoc(doc(db, 'pedidos', pedido.id), {
                ...pedido,
                estado: 'Pendiente',
                fechaCompletado: null,
                fechaCancelacion: null
            });

            // 2. Eliminar de completados
            await deleteDoc(doc(db, 'pedidos_completados', pedido.id));

            // 3. Actualizar estado local
            setPedidos(prev => prev.filter(p => p.id !== pedido.id));
            setFilteredPedidos(prev => prev.filter(p => p.id !== pedido.id));

            Swal.fire({
                title: '¡Éxito!',
                text: 'Pedido devuelto a pendientes',
                icon: 'success',
                confirmButtonText: 'Entendido'
            });
        } catch (error) {
            console.error("Error devolviendo pedido:", error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo devolver el pedido',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    };

    // Resetear filtros
    const resetFilters = () => {
        setSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setStartDate(null);
        setEndDate(null);
    };

    // Función para formatear fecha con detalle de cancelación si existe
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
            <h2>Historial de Pedidos Completados</h2>

            {/* Filtros */}
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
                        <input
                            type="number"
                            placeholder="Mínimo"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            min="0"
                            step="100"
                        />
                        <span>a</span>
                        <input
                            type="number"
                            placeholder="Máximo"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            min="0"
                            step="100"
                        />
                    </div>
                </div>

                <div className="filtro-group">
                    <label>Rango de fechas:</label>
                    <div className="date-range">
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            placeholderText="Fecha inicio"
                            dateFormat="dd/MM/yyyy"
                            maxDate={new Date()}
                            locale="es"
                        />
                        <span>a</span>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            placeholderText="Fecha fin"
                            dateFormat="dd/MM/yyyy"
                            maxDate={new Date()}
                            locale="es"
                        />
                    </div>
                </div>

                <button onClick={resetFilters} className="btn-reset">
                    Limpiar Filtros
                </button>
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
                                <p><strong>DNI:</strong> {pedido.dni}</p>
                            </div>

                            <div className="pedido-details">
                                <p><strong>Fecha pedido:</strong> {pedido.fecha?.toLocaleString('es-AR') || 'No disponible'}</p>
                                <p><strong>Fecha finalización:</strong> {formatCancelationInfo(pedido)}</p>
                                <p><strong>Total:</strong> ${pedido.total.toLocaleString('es-AR')}</p>
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

                            {pedido.canceladoPor !== 'cliente' && (
                                <div className="pedido-actions">
                                    <button
                                        className="btn-desarchivar"
                                        onClick={() => devolverPedido(pedido)}
                                        disabled={pedido.estado === 'Cancelado'}
                                    >
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