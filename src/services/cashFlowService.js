import { db } from '../firebase/config';
import { collection, getDocs, query, where, Timestamp, writeBatch, doc, increment, serverTimestamp } from 'firebase/firestore';

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
        const cobrosDeudaQuery = query(
            collection(db, 'cobros_deuda'),
            where('createdAt', '>=', startTimestamp),
            where('createdAt', '<=', endTimestamp)
        );

        const [presencialesSnap, onlineSnap, cobrosDeudaSnap] = await Promise.all([
            getDocs(presencialesQuery),
            getDocs(onlineQuery),
            getDocs(cobrosDeudaQuery)
        ]);

        const presencialesList = presencialesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Venta Presencial' }));
        const onlineList = onlineSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Pedido Online' }));
        const cobrosDeudaList = cobrosDeudaSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Cobro Deuda' }));

        const combined = [...presencialesList, ...onlineList, ...cobrosDeudaList];
        combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        return combined;
    } catch (error) {
        console.error("Error fetching daily transactions from service:", error);
        return [];
    }
};