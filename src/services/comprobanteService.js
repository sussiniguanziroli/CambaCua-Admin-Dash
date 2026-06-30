// comprobanteService.js
// Numeración consecutiva y atómica de comprobantes (ventas, recibos).
// No reemplaza el doc ID de Firestore: agrega un número legible (ej. C000001).
import { db } from '../firebase/config';
import { doc, runTransaction } from 'firebase/firestore';

// Prefijo por tipo de comprobante.
const PREFIXES = { ventas: 'C', recibos: 'R' };
const PAD = 6;

const buildCode = (tipo, numero) => {
    if (!numero) return null;
    const prefix = PREFIXES[tipo] || '';
    return `${prefix}${String(numero).padStart(PAD, '0')}`;
};

/**
 * Formatea un número crudo a su código de comprobante (ej. ('ventas', 1) -> 'C000001').
 * Útil para mostrar comprobantes ya guardados.
 */
export const formatComprobante = (tipo, numero) => buildCode(tipo, numero);

/**
 * Obtiene el siguiente número consecutivo para un tipo de comprobante de forma atómica.
 * Usa una transacción sobre contadores/{tipo} para evitar duplicados ante ventas simultáneas.
 * IMPORTANTE: debe llamarse fuera del writeBatch de la venta (los batches no pueden leer).
 * Si la operación posterior falla, el número queda "quemado" (hueco). Aceptable para uso interno.
 *
 * @returns {Promise<{ numero: number, code: string }>}
 */
export const getNextComprobanteNumber = async (tipo) => {
    const counterRef = doc(db, 'contadores', tipo);
    const numero = await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const last = snap.exists() ? (snap.data().ultimo || 0) : 0;
        const next = last + 1;
        tx.set(counterRef, { ultimo: next }, { merge: true });
        return next;
    });
    return { numero, code: buildCode(tipo, numero) };
};

/**
 * Reserva un rango de N números consecutivos en una sola transacción.
 * Útil para emitir varios comprobantes a la vez (ej. recibos en lote).
 *
 * @returns {Promise<Array<{ numero: number, code: string }>>} lista ordenada de N comprobantes.
 */
export const reserveComprobanteRange = async (tipo, count) => {
    if (!count || count < 1) return [];
    const counterRef = doc(db, 'contadores', tipo);
    const start = await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const last = snap.exists() ? (snap.data().ultimo || 0) : 0;
        tx.set(counterRef, { ultimo: last + count }, { merge: true });
        return last + 1;
    });
    return Array.from({ length: count }, (_, i) => {
        const numero = start + i;
        return { numero, code: buildCode(tipo, numero) };
    });
};
