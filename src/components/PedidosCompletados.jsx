import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PedidosCompletados = () => {
    const [pedidos, setPedidos] = useState([]);
    const [filteredPedidos, setFilteredPedidos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);

    // Obtener todos los pedidos archivados ordenados por fecha
    useEffect(() => {
        const fetchPedidos = async () => {
            setLoading(true);
            try {
                const completadosCollection = collection(db, 'pedidos_completados');
                const q = query(completadosCollection, orderBy('fechaArchivado', 'desc'));
                const completadosSnapshot = await getDocs(q);
                const pedidosList = completadosSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    fechaArchivado: doc.data().fechaArchivado?.toDate(),
                    fecha: doc.data().fecha?.toDate()
                }));
                setPedidos(pedidosList);
                setFilteredPedidos(pedidosList);
            } catch (error) {
                console.error("Error fetching pedidos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPedidos();
    }, []);

    // Función para aplicar filtros
    useEffect(() => {
        let result = [...pedidos];
        
        // Filtrar por término de búsqueda (nombre, email o DNI)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(pedido => 
                pedido.nombre?.toLowerCase().includes(term) ||
                pedido.email?.toLowerCase().includes(term) ||
                pedido.dni?.toLowerCase().includes(term)
            );
        }
        
        // Filtrar por rango de precios
        if (minPrice) {
            result = result.filter(pedido => pedido.total >= Number(minPrice));
        }
        if (maxPrice) {
            result = result.filter(pedido => pedido.total <= Number(maxPrice));
        }
        
        // Filtrar por rango de fechas
        if (startDate) {
            result = result.filter(pedido => 
                pedido.fechaArchivado >= startDate
            );
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(pedido => 
                pedido.fechaArchivado <= endOfDay
            );
        }
        
        setFilteredPedidos(result);
    }, [pedidos, searchTerm, minPrice, maxPrice, startDate, endDate]);

    // Función para desarchivar un pedido
    const desarchivarPedido = async (pedido) => {
        if (!window.confirm(`¿Estás seguro de marcar el pedido de ${pedido.nombre} como pendiente nuevamente?`)) {
            return;
        }

        try {
            // 1. Mover el pedido de vuelta a la colección principal
            const pedidosRef = collection(db, 'pedidos');
            await addDoc(pedidosRef, {
                ...pedido,
                estado: 'Pendiente',
                archivado: false,
                fechaCompletado: null
            });

            // 2. Eliminar de pedidos_completados
            const pedidoCompletadoRef = doc(db, 'pedidos_completados', pedido.id);
            await deleteDoc(pedidoCompletadoRef);

            // 3. Actualizar el estado local
            setPedidos(prev => prev.filter(p => p.id !== pedido.id));
            setFilteredPedidos(prev => prev.filter(p => p.id !== pedido.id));

            alert("Pedido desarchivado correctamente");
        } catch (error) {
            console.error("Error desarchivando pedido:", error);
            alert("Error al desarchivar el pedido");
        }
    };

    // Función para resetear filtros
    const resetFilters = () => {
        setSearchTerm('');
        setMinPrice('');
        setMaxPrice('');
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <div className="pedidos-container">
            <h2>Historial de Pedidos Completados</h2>
            
            {/* Filtros */}
            <div className="filtros-container">
                <div className="filtro-group">
                    <label>Buscar (nombre, email o DNI):</label>
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
                        />
                        <span>a</span>
                        <input
                            type="number"
                            placeholder="Máximo"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
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
                        />
                    </div>
                </div>

                <button onClick={resetFilters} className="btn-reset">
                    Limpiar Filtros
                </button>
            </div>

            {loading ? (
                <p>Cargando pedidos...</p>
            ) : filteredPedidos.length === 0 ? (
                <p>No hay pedidos que coincidan con los filtros.</p>
            ) : (
                <div className="grid-container">
                    {filteredPedidos.map(pedido => (
                        <div key={pedido.id} className="pedido-box archived">
                            <h3>Pedido de: {pedido.nombre}</h3>
                            <p><strong>Estado:</strong> {pedido.estado}</p>
                            <p><strong>Fecha de envío:</strong> {pedido.fechaArchivado?.toLocaleString()}</p>
                            <p><strong>Dirección:</strong> {pedido.direccion}</p>
                            <p><strong>Email:</strong> {pedido.email}</p>
                            <p><strong>DNI:</strong> {pedido.dni}</p>
                            <p><strong>Teléfono:</strong> {pedido.telefono}</p>
                            {pedido.fecha && (
                                <p><strong>Fecha del pedido:</strong> {pedido.fecha.toLocaleString()}</p>
                            )}
                            <p><strong>Total:</strong> ${pedido.total}</p>

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
                                    className="btn-desarchivar"
                                    onClick={() => desarchivarPedido(pedido)}
                                >
                                    Marcar como Pendiente
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PedidosCompletados;