import { db } from '../firebase/config';
import { collection, getDocs, query, where, Timestamp, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * Registers a payment against a tutor's outstanding debt.
 * This operation is atomic (uses a batch write).
 * @param {string} tutorId - The ID of the tutor making the payment.
 * @param {object} tutorData - The full tutor object.
 * @param {number} amount - The amount being paid.
 * @param {string} paymentMethod - The method of payment (e.g., 'Efectivo').
 * @returns {Promise<{success: boolean, error: any}>} - An object indicating the result.
 */
export const registerDebtPayment = async (tutorId, tutorData, amount, paymentMethod) => {
    try {
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            throw new Error('Monto de pago inválido.');
        }

        const batch = writeBatch(db);

        // 1. Create a new document in 'pagos_deuda' collection
        const paymentRef = doc(collection(db, 'pagos_deuda'));
        batch.set(paymentRef, {
            tutorId: tutorId,
            tutorName: tutorData.name,
            amount: paymentAmount,
            paymentMethod: paymentMethod,
            createdAt: serverTimestamp(),
        });

        // 2. Update the tutor's accountBalance (increment by the positive amount)
        const tutorRef = doc(db, 'tutores', tutorId);
        batch.update(tutorRef, { 
            accountBalance: increment(paymentAmount) 
        });

        await batch.commit();
        return { success: true, error: null };
    } catch (error) {
        console.error("Error al registrar el pago de deuda:", error);
        return { success: false, error: error };
    }
};

/**
 * Fetches all transactions (sales, online orders, debt payments) for a specific date.
 * @param {Date} date - The date for which to fetch transactions.
 * @returns {Promise<Array>} - A sorted array of transaction objects.
 */
export const fetchDailyTransactions = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    try {
        // Define queries for all transaction types
        const presencialesQuery = query(
            collection(db, 'ventas_presenciales'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );
        const onlineQuery = query(
            collection(db, 'pedidos_completados'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );
        const paymentsQuery = query(
            collection(db, 'pagos_deuda'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );

        // Fetch all data in parallel
        const [presencialesSnap, onlineSnap, paymentsSnap] = await Promise.all([
            getDocs(presencialesQuery),
            getDocs(onlineQuery),
            getDocs(paymentsQuery)
        ]);

        // Map and format the data
        const presencialesList = presencialesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Venta Presencial' }));
        const onlineList = onlineSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Pedido Online' }));
        const paymentsList = paymentsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Cobro Deuda' }));

        // Combine and sort all transactions
        const combined = [...presencialesList, ...onlineList, ...paymentsList];
        combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        return combined;
    } catch (error) {
        console.error("Error fetching daily transactions from service:", error);
        return []; // Return an empty array on error
    }
};
