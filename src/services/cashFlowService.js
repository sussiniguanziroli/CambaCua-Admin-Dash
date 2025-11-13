import { db } from '../firebase/config';
import { collection, getDocs, query, where, Timestamp, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';

export const registerDebtPayment = async (tutorId, tutorData, amount, paymentMethod) => {
    try {
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            throw new Error('Monto de pago inválido.');
        }

        const batch = writeBatch(db);

        const paymentRef = doc(collection(db, 'pagos_deuda'));
        batch.set(paymentRef, {
            tutorId: tutorId,
            tutorName: tutorData.name,
            amount: paymentAmount,
            paymentMethod: paymentMethod,
            createdAt: serverTimestamp(),
        });

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

export const fetchDailyTransactions = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);

    try {
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
        const pagosDeudaQuery = query(
            collection(db, 'pagos_deuda'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );
        const cobrosDeudaQuery = query(
            collection(db, 'cobros_deuda'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );

        const [presencialesSnap, onlineSnap, pagosDeudaSnap, cobrosDeudaSnap] = await Promise.all([
            getDocs(presencialesQuery),
            getDocs(onlineQuery),
            getDocs(pagosDeudaQuery),
            getDocs(cobrosDeudaQuery)
        ]);

        const presencialesList = presencialesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Venta Presencial' }));
        const onlineList = onlineSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Pedido Online' }));
        const pagosDeudaList = pagosDeudaSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Cobro Deuda' }));
        const cobrosDeudaList = cobrosDeudaSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Cobro Deuda' }));

        const combined = [...presencialesList, ...onlineList, ...pagosDeudaList, ...cobrosDeudaList];
        combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        return combined;
    } catch (error) {
        console.error("Error fetching daily transactions from service:", error);
        return [];
    }
};