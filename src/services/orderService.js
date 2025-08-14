// src/services/orderService.js
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Fetches all orders (pending and completed) for a given user.
 * @param {string} userId The UID of the user.
 * @returns {Promise<{orders: Array, score: number}>} An object containing the list of orders and the calculated score.
 */
export const getUsersOrders = async (userId) => {
    if (!userId) {
        console.error("User ID is required to fetch orders.");
        return { orders: [], score: 0 };
    }

    try {
        // Create queries for both collections
        const pedidosRef = collection(db, 'pedidos');
        const pedidosCompletadosRef = collection(db, 'pedidos_completados');

        const qPedidos = query(pedidosRef, where('userId', '==', userId));
        const qPedidosCompletados = query(pedidosCompletadosRef, where('userId', '==', userId));

        // Fetch documents from both collections in parallel
        const [pedidosSnapshot, pedidosCompletadosSnapshot] = await Promise.all([
            getDocs(qPedidos),
            getDocs(qPedidosCompletados)
        ]);

        const allOrders = [];

        // Map and format pending orders
        pedidosSnapshot.forEach(doc => {
            allOrders.push({
                id: doc.id,
                ...doc.data(),
                status: 'Pendiente'
            });
        });

        // Map and format completed orders
        pedidosCompletadosSnapshot.forEach(doc => {
            allOrders.push({
                id: doc.id,
                ...doc.data(),
                status: 'Completado'
            });
        });

        // Sort all orders by date in descending order
        allOrders.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        // Calculate score (simple example: 1 point per order)
        const score = allOrders.length;

        return { orders: allOrders, score };

    } catch (error) {
        console.error("Error fetching user orders:", error);
        return { orders: [], score: 0 };
    }
};
