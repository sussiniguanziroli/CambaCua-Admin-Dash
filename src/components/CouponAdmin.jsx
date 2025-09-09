import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, serverTimestamp, writeBatch, doc, Timestamp, query, where, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { FaTicketAlt, FaPlus, FaEye, FaCopy, FaCalendarAlt, FaChevronDown, FaChevronUp, FaChartBar, FaCheckCircle, FaHourglassHalf, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import LoaderSpinner from '../components/utils/LoaderSpinner';

const CouponAdmin = () => {
    const [couponBatches, setCouponBatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [view, setView] = useState('create');
    const [generatedCoupons, setGeneratedCoupons] = useState(null);

    const [quantity, setQuantity] = useState('');
    const [points, setPoints] = useState('');
    const [prefix, setPrefix] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    const [expandedBatchId, setExpandedBatchId] = useState(null);
    const [batchDetails, setBatchDetails] = useState({ codes: [], claimed: 0, unclaimed: 0 });
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);

    const fetchCouponBatches = useCallback(async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'coupon_batches'));
            const batchesData = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                };
            }).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setCouponBatches(batchesData);
        } catch (err) {
            console.error('Error al obtener los lotes de cupones: ', err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los lotes de cupones.' });
        } finally {
            setIsLoading(false);
        }
    }, []);


    useEffect(() => {
        if (view === 'list') {
            fetchCouponBatches();
        }
    }, [view, fetchCouponBatches]);

    const handleToggleBatchDetails = async (batchId) => {
        if (expandedBatchId === batchId) {
            setExpandedBatchId(null);
            return;
        }

        setIsDetailsLoading(true);
        setExpandedBatchId(batchId);
        try {
            const q = query(collection(db, "redeemable_coupons"), where("batchId", "==", batchId));
            const querySnapshot = await getDocs(q);
            
            const codes = [];
            let claimedCount = 0;
            
            querySnapshot.forEach((doc) => {
                const coupon = doc.data();
                codes.push({ code: coupon.code, isClaimed: coupon.isClaimed });
                if (coupon.isClaimed) {
                    claimedCount++;
                }
            });
            
            const batch = couponBatches.find(b => b.id === batchId);
            const total = batch ? batch.quantity : codes.length;

            setBatchDetails({
                codes,
                claimed: claimedCount,
                unclaimed: total - claimedCount
            });

        } catch (error) {
            console.error("Error fetching coupon details:", error);
            Swal.fire('Error', 'No se pudieron cargar los detalles del lote.', 'error');
            setExpandedBatchId(null);
        } finally {
            setIsDetailsLoading(false);
        }
    };


    const generateRandomCode = (length = 6) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleBulkCreate = async (e) => {
        e.preventDefault();
        const numQuantity = parseInt(quantity, 10);
        const numPoints = parseInt(points, 10);

        if (isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPoints) || numPoints <= 0) {
            Swal.fire('Valores inválidos', 'La cantidad y los puntos deben ser números positivos.', 'warning');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        if (expiresAt && new Date(expiresAt) < today) {
            Swal.fire('Fecha inválida', 'La fecha de expiración no puede ser en el pasado.', 'error');
            return;
        }

        setIsSubmitting(true);
        setGeneratedCoupons(null);
        const batch = writeBatch(db);
        const batchPrefix = prefix.trim().toUpperCase();
        const expiryDate = expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null;

        try {
            const batchRef = doc(collection(db, 'coupon_batches'));
            batch.set(batchRef, {
                prefix: batchPrefix,
                points: numPoints,
                quantity: numQuantity,
                createdAt: serverTimestamp(),
                expiresAt: expiryDate,
                isActive: true, 
            });

            const generatedCodes = new Set();
            const newCoupons = [];
            for (let i = 0; i < numQuantity; i++) {
                let code;
                do {
                    code = generateRandomCode();
                } while (generatedCodes.has(code));
                generatedCodes.add(code);

                const finalCode = batchPrefix ? `${batchPrefix}-${code}` : code;
                const couponRef = doc(collection(db, 'redeemable_coupons'));
                batch.set(couponRef, {
                    code: finalCode,
                    points: numPoints,
                    isClaimed: false,
                    batchId: batchRef.id,
                    claimedBy: null,
                    claimedAt: null,
                    expiresAt: expiryDate,
                    hasExpired: false, 
                });
                newCoupons.push(finalCode);
            }

            await batch.commit();

            setGeneratedCoupons(newCoupons);
            Swal.fire('¡Éxito!', `${numQuantity} cupones han sido generados correctamente.`, 'success');
            setQuantity('');
            setPoints('');
            setPrefix('');
            setExpiresAt('');

        } catch (error) {
            console.error("Error al generar cupones en lote:", error);
            Swal.fire('Error', 'Ocurrió un problema al generar los cupones.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const copyToClipboard = (text, message = 'Copiado al portapapeles') => {
        navigator.clipboard.writeText(text).then(() => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: message,
                showConfirmButton: false,
                timer: 1500
            });
        });
    };
    
    const handleToggleActive = async (batchId, currentStatus) => {
        const newStatus = !currentStatus;
        const actionText = newStatus ? "activar" : "desactivar";

        const { isConfirmed } = await Swal.fire({
            title: `¿Estás seguro?`,
            text: `Vas a ${actionText} este lote de cupones.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${actionText}`,
            cancelButtonText: 'Cancelar'
        });

        if (isConfirmed) {
            const batchRef = doc(db, 'coupon_batches', batchId);
            try {
                await updateDoc(batchRef, { isActive: newStatus });
                setCouponBatches(prevBatches =>
                    prevBatches.map(b => b.id === batchId ? { ...b, isActive: newStatus } : b)
                );
                Swal.fire('¡Actualizado!', `El lote ha sido ${actionText === 'activar' ? 'activado' : 'desactivado'}.`, 'success');
            } catch (error) {
                console.error("Error updating batch status:", error);
                Swal.fire('Error', 'No se pudo actualizar el estado del lote.', 'error');
            }
        }
    };


    const copyUnclaimedCodes = () => {
        const unclaimedCodes = batchDetails.codes.filter(c => !c.isClaimed).map(c => c.code).join('\n');
        if(unclaimedCodes) {
            copyToClipboard(unclaimedCodes, 'Códigos disponibles copiados');
        } else {
            Swal.fire('Nada que copiar', 'No hay códigos disponibles en este lote.', 'info');
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Nunca';
        return timestamp.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    
    const getStatus = (batch) => {
        if (batch.expiresAt && batch.expiresAt.toDate() < new Date()) {
            return { text: 'Expirado', className: 'expired' };
        }
        if (!batch.isActive) {
            return { text: 'Inactivo', className: 'inactive' };
        }
        return { text: 'Activo', className: 'active' };
    };


    return (
        <div className="coupon-admin-container">
            <h1><FaTicketAlt /> Administrador de Cupones</h1>
            <div className="view-switcher">
                <button onClick={() => setView('create')} className={view === 'create' ? 'active' : ''}><FaPlus /> Generar Lote</button>
                <button onClick={() => { setView('list'); setExpandedBatchId(null); }} className={view === 'list' ? 'active' : ''}><FaEye /> Ver Lotes</button>
            </div>

            {view === 'create' && (
                 <div className="coupon-form-wrapper">
                    <form onSubmit={handleBulkCreate} className="coupon-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Cantidad de Cupones</label>
                                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ej: 50" required min="1" />
                            </div>
                            <div className="form-group">
                                <label>Puntos por Cupón</label>
                                <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Ej: 100" required min="1" />
                            </div>
                        </div>
                        <div className="form-row">
                             <div className="form-group">
                                <label>Fecha de Expiración (Opcional)</label>
                                <div className="date-input-wrapper">
                                    <FaCalendarAlt />
                                    <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Prefijo (Opcional)</label>
                                <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Ej: VERANO24" />
                            </div>
                        </div>
                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? <LoaderSpinner size="small-inline" /> : `Generar ${quantity || ''} Cupones`}
                        </button>
                    </form>
                    {generatedCoupons && (
                        <div className="generated-coupons-display">
                            <h3>Cupones Generados</h3>
                            <textarea readOnly value={generatedCoupons.join('\n')} />
                            <button onClick={() => copyToClipboard(generatedCoupons.join('\n'))}>
                                <FaCopy /> Copiar Códigos
                            </button>
                        </div>
                    )}
                </div>
            )}

            {view === 'list' && (
                <div className="coupon-list-wrapper">
                    {isLoading ? <LoaderSpinner size="large" /> : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Prefijo</th>
                                    <th>Puntos</th>
                                    <th>Cantidad</th>
                                    <th>Estado</th>
                                    <th>Expira</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {couponBatches.map(batch => {
                                    const status = getStatus(batch);
                                    return(
                                    <React.Fragment key={batch.id}>
                                        <tr>
                                            <td className="coupon-prefix">{batch.prefix || '(Ninguno)'}</td>
                                            <td>{batch.points}</td>
                                            <td>{batch.quantity}</td>
                                            <td>
                                                <span className={`status-badge ${status.className}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                            <td>{formatDate(batch.expiresAt)}</td>
                                            <td className="actions-cell">
                                                <button 
                                                    className="details-btn" 
                                                    onClick={() => handleToggleBatchDetails(batch.id)}
                                                >
                                                    {expandedBatchId === batch.id ? <FaChevronUp/> : <FaChevronDown />}
                                                    Detalles
                                                </button>
                                                <button 
                                                    className={`toggle-btn ${batch.isActive ? 'active' : 'inactive'}`} 
                                                    onClick={() => handleToggleActive(batch.id, batch.isActive)}
                                                    disabled={status.className === 'expired'}
                                                >
                                                   {batch.isActive ? <FaToggleOn/> : <FaToggleOff/>}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedBatchId === batch.id && (
                                            <tr className="batch-details-row">
                                                <td colSpan="6">
                                                    {isDetailsLoading ? <LoaderSpinner/> : (
                                                        <div className="batch-details-content">
                                                            <h4><FaChartBar/> Estadísticas del Lote</h4>
                                                            <div className="stats-container">
                                                                <div className="stat-item claimed">
                                                                    <span className="stat-value">{batchDetails.claimed}</span>
                                                                    <span className="stat-label">Reclamados</span>
                                                                </div>
                                                                <div className="stat-item unclaimed">
                                                                    <span className="stat-value">{batchDetails.unclaimed}</span>
                                                                    <span className="stat-label">Disponibles</span>
                                                                </div>
                                                            </div>
                                                            <div className="coupon-codes-section">
                                                                <h4>Códigos del Lote</h4>
                                                                <div className="coupon-codes-list">
                                                                    {batchDetails.codes.map(coupon => (
                                                                        <div key={coupon.code} className="coupon-code-item">
                                                                            <span className="coupon-code-text">{coupon.code}</span>
                                                                            <span className={`coupon-status-badge ${coupon.isClaimed ? 'claimed' : 'available'}`}>
                                                                                {coupon.isClaimed ? <><FaCheckCircle/> Reclamado</> : <><FaHourglassHalf/> Disponible</>}
                                                                            </span>
                                                                            <button className="copy-code-btn" onClick={() => copyToClipboard(coupon.code)}>
                                                                                <FaCopy />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <button className="copy-all-btn" onClick={copyUnclaimedCodes}>
                                                                    <FaCopy /> Copiar Disponibles
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )})}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default CouponAdmin;
