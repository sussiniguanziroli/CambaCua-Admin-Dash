import { db } from '../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

const CACHE_DURATION = 10 * 60 * 1000;
let statsCache = new Map();
const BATCH_SIZE = 15;

const getDateRange = (period) => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date(now);
    
    switch(period) {
        case '3months':
            startDate.setMonth(now.getMonth() - 3);
            break;
        case '6months':
            startDate.setMonth(now.getMonth() - 6);
            break;
        case '1year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
            startDate = new Date(2020, 0, 1);
            break;
        default:
            startDate.setMonth(now.getMonth() - 6);
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    const previousStartDate = new Date(startDate);
    const diff = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(startDate.getTime() - diff);
    
    return {
        current: { start: Timestamp.fromDate(startDate), end: Timestamp.fromDate(endDate) },
        previous: { start: Timestamp.fromDate(previousStartDate), end: Timestamp.fromDate(startDate) }
    };
};

const calculateDecay = (dateTimestamp) => {
    if (!dateTimestamp || !dateTimestamp.toDate) return 1;
    
    const now = new Date();
    const date = dateTimestamp.toDate();
    const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    
    const decay = Math.max(0.5, 1 - (monthsDiff * 0.2));
    return decay;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchInBatches = async (items, fetchFunction, progressCallback, baseProgress, progressRange) => {
    const results = [];
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(item => fetchFunction(item))
        );
        results.push(...batchResults);
        
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const progress = baseProgress + Math.floor((currentBatch / totalBatches) * progressRange);
        if (progressCallback) {
            progressCallback({ 
                step: 'batching', 
                progress, 
                message: `Procesando lote ${currentBatch} de ${totalBatches}...` 
            });
        }
        
        if (i + BATCH_SIZE < items.length) {
            await sleep(80);
        }
    }
    
    return results;
};

const filterBySpecies = (tutorStats, speciesFilter) => {
    if (speciesFilter === 'all') return tutorStats;
    
    return tutorStats.filter(stat => {
        return stat.species.some(s => {
            if (speciesFilter === 'Canino') return s === 'Canino' || s?.toLowerCase().includes('perro');
            if (speciesFilter === 'Felino') return s === 'Felino' || s?.toLowerCase().includes('gato');
            return false;
        });
    });
};

export const calculateAllTopCustomers = async (period, limit = 10, onProgress) => {
    const cacheKey = `all-${period}-${limit}`;
    
    if (statsCache.has(cacheKey)) {
        const cached = statsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            if (onProgress) onProgress({ step: 'complete', progress: 100, message: 'Datos en caché' });
            return cached.data;
        }
    }

    try {
        if (onProgress) onProgress({ step: 'init', progress: 5, message: 'Inicializando...' });
        
        const dateRange = getDateRange(period);
        
        if (onProgress) onProgress({ step: 'ventas', progress: 10, message: 'Analizando ventas del período...' });
        
        const salesQuery = query(
            collection(db, 'ventas_presenciales'),
            where('createdAt', '>=', dateRange.current.start),
            where('createdAt', '<=', dateRange.current.end)
        );
        const salesSnap = await getDocs(salesQuery);
        const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const previousSalesQuery = query(
            collection(db, 'ventas_presenciales'),
            where('createdAt', '>=', dateRange.previous.start),
            where('createdAt', '<=', dateRange.previous.end)
        );
        const previousSalesSnap = await getDocs(previousSalesQuery);
        const previousSales = previousSalesSnap.docs.map(doc => doc.data());

        const activeTutorIds = new Set(sales.map(s => s.tutorInfo?.id).filter(Boolean));
        
        if (activeTutorIds.size === 0) {
            if (onProgress) onProgress({ step: 'complete', progress: 100, message: 'No hay ventas en este período' });
            
            const emptyResult = {
                all: [],
                bySpecies: {
                    Canino: { bySpent: [], byFrequency: [], byEngagement: [], all: [] },
                    Felino: { bySpent: [], byFrequency: [], byEngagement: [], all: [] },
                    all: { bySpent: [], byFrequency: [], byEngagement: [], all: [] }
                }
            };
            
            return emptyResult;
        }

        if (onProgress) onProgress({ step: 'tutores', progress: 15, message: `Cargando ${activeTutorIds.size} tutores activos...` });
        
        const tutoresSnap = await getDocs(collection(db, 'tutores'));
        const allTutores = tutoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tutores = allTutores.filter(t => activeTutorIds.has(t.id));
        
        if (onProgress) onProgress({ step: 'pacientes', progress: 20, message: 'Cargando pacientes...' });
        
        const pacientesSnap = await getDocs(collection(db, 'pacientes'));
        const allPacientes = pacientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activePacientes = allPacientes.filter(p => activeTutorIds.has(p.tutorId));
        
        const tutorPatientsMap = new Map();
        activePacientes.forEach(p => {
            if (!tutorPatientsMap.has(p.tutorId)) {
                tutorPatientsMap.set(p.tutorId, []);
            }
            tutorPatientsMap.get(p.tutorId).push(p);
        });

        if (onProgress) onProgress({ step: 'citas', progress: 25, message: 'Cargando citas y servicios...' });
        
        const [citasSnap, groomingSnap] = await Promise.all([
            getDocs(query(
                collection(db, 'citas'),
                where('startTime', '>=', dateRange.current.start),
                where('startTime', '<=', dateRange.current.end)
            )),
            getDocs(query(
                collection(db, 'turnos_peluqueria'),
                where('startTime', '>=', dateRange.current.start),
                where('startTime', '<=', dateRange.current.end)
            ))
        ]);
        
        const allCitas = citasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allGrooming = groomingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (onProgress) onProgress({ step: 'historias', progress: 30, message: `Cargando datos clínicos (${activePacientes.length} pacientes)...` });
        
        const historiasData = await fetchInBatches(
            activePacientes,
            async (patient) => {
                try {
                    const q = query(
                        collection(db, `pacientes/${patient.id}/clinical_history`),
                        where('createdAt', '>=', dateRange.current.start),
                        where('createdAt', '<=', dateRange.current.end)
                    );
                    const snap = await getDocs(q);
                    return { patientId: patient.id, docs: snap.docs };
                } catch (error) {
                    return { patientId: patient.id, docs: [] };
                }
            },
            onProgress,
            30,
            15
        );

        if (onProgress) onProgress({ step: 'recetas', progress: 45, message: 'Cargando recetas...' });
        
        const recetasData = await fetchInBatches(
            activePacientes,
            async (patient) => {
                try {
                    const q = query(
                        collection(db, `pacientes/${patient.id}/clinical_recipes`),
                        where('createdAt', '>=', dateRange.current.start),
                        where('createdAt', '<=', dateRange.current.end)
                    );
                    const snap = await getDocs(q);
                    return { patientId: patient.id, docs: snap.docs };
                } catch (error) {
                    return { patientId: patient.id, docs: [] };
                }
            },
            onProgress,
            45,
            15
        );

        if (onProgress) onProgress({ step: 'vencimientos', progress: 60, message: 'Cargando vencimientos...' });
        
        const vencimientosData = await fetchInBatches(
            activePacientes,
            async (patient) => {
                try {
                    const q = query(
                        collection(db, `pacientes/${patient.id}/vencimientos`),
                        where('dueDate', '>=', dateRange.current.start)
                    );
                    const snap = await getDocs(q);
                    return { patientId: patient.id, docs: snap.docs };
                } catch (error) {
                    return { patientId: patient.id, docs: [] };
                }
            },
            onProgress,
            60,
            10
        );

        if (onProgress) onProgress({ step: 'processing', progress: 70, message: 'Organizando datos...' });

        const historiasByPatient = new Map();
        historiasData.forEach(({ patientId, docs }) => {
            historiasByPatient.set(patientId, docs);
        });

        const recetasByPatient = new Map();
        recetasData.forEach(({ patientId, docs }) => {
            recetasByPatient.set(patientId, docs);
        });

        const vencimientosByPatient = new Map();
        vencimientosData.forEach(({ patientId, docs }) => {
            vencimientosByPatient.set(patientId, docs);
        });

        if (onProgress) onProgress({ step: 'calculating', progress: 75, message: 'Calculando estadísticas...' });

        const tutorStats = [];
        
        for (const tutor of tutores) {
            const tutorPatients = tutorPatientsMap.get(tutor.id) || [];
            
            if (tutorPatients.length === 0) continue;

            const patientSpecies = [...new Set(tutorPatients.map(p => p.species))];

            const tutorSales = sales.filter(s => s.tutorInfo?.id === tutor.id);
            const totalSpent = tutorSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const purchaseCount = tutorSales.length;

            const previousTutorSales = previousSales.filter(s => s.tutorInfo?.id === tutor.id);
            const previousSpent = previousTutorSales.reduce((sum, s) => sum + (s.total || 0), 0);
            const previousCount = previousTutorSales.length;

            const tutorCitas = allCitas.filter(c => c.tutorId === tutor.id);
            const tutorGrooming = allGrooming.filter(g => g.tutorId === tutor.id);
            
            let engagementScore = 0;
            let historiaCount = 0;
            let recetaCount = 0;
            let vencimientoCount = 0;

            for (const patient of tutorPatients) {
                const historias = historiasByPatient.get(patient.id) || [];
                historiaCount += historias.length;
                historias.forEach(doc => {
                    const decay = calculateDecay(doc.data().createdAt);
                    engagementScore += 2 * decay;
                });

                const recetas = recetasByPatient.get(patient.id) || [];
                recetaCount += recetas.length;
                recetas.forEach(doc => {
                    const decay = calculateDecay(doc.data().createdAt);
                    engagementScore += 2.5 * decay;
                });

                const vencimientos = vencimientosByPatient.get(patient.id) || [];
                vencimientoCount += vencimientos.length;
                vencimientos.forEach(() => {
                    engagementScore += 1.5;
                });
            }

            tutorCitas.forEach(c => {
                const decay = calculateDecay(c.startTime);
                engagementScore += 3 * decay;
            });

            tutorGrooming.forEach(g => {
                const decay = calculateDecay(g.startTime);
                engagementScore += 2 * decay;
            });

            const lastPurchase = tutorSales.length > 0 
                ? tutorSales.reduce((latest, s) => s.createdAt.toMillis() > latest.toMillis() ? s.createdAt : latest, tutorSales[0].createdAt)
                : null;

            tutorStats.push({
                tutorId: tutor.id,
                tutorName: tutor.name,
                totalSpent,
                purchaseCount,
                engagementScore: Math.round(engagementScore),
                trend: {
                    spent: getTrendIndicator(totalSpent, previousSpent),
                    frequency: getTrendIndicator(purchaseCount, previousCount),
                    engagement: 'stable'
                },
                breakdown: {
                    citas: tutorCitas.length,
                    grooming: tutorGrooming.length,
                    historias: historiaCount,
                    recetas: recetaCount,
                    vencimientos: vencimientoCount
                },
                lastPurchase,
                avgTicket: purchaseCount > 0 ? totalSpent / purchaseCount : 0,
                species: patientSpecies,
                patients: tutorPatients.map(p => ({ id: p.id, name: p.name, species: p.species })),
                accountBalance: tutor.accountBalance || 0
            });
        }

        if (onProgress) onProgress({ step: 'filtering', progress: 90, message: 'Generando rankings por especie...' });

        const caninoStats = filterBySpecies(tutorStats, 'Canino');
        const felinoStats = filterBySpecies(tutorStats, 'Felino');

        const result = {
            all: tutorStats,
            bySpecies: {
                Canino: {
                    bySpent: [...caninoStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit),
                    byFrequency: [...caninoStats].sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, limit),
                    byEngagement: [...caninoStats].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, limit),
                    all: caninoStats
                },
                Felino: {
                    bySpent: [...felinoStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit),
                    byFrequency: [...felinoStats].sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, limit),
                    byEngagement: [...felinoStats].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, limit),
                    all: felinoStats
                },
                all: {
                    bySpent: [...tutorStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit),
                    byFrequency: [...tutorStats].sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, limit),
                    byEngagement: [...tutorStats].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, limit),
                    all: tutorStats
                }
            }
        };

        if (onProgress) onProgress({ step: 'complete', progress: 100, message: 'Completado!' });

        statsCache.set(cacheKey, { data: result, timestamp: Date.now() });

        return result;

    } catch (error) {
        console.error('Error calculating top customers:', error);
        throw error;
    }
};

const getTrendIndicator = (currentValue, previousValue) => {
    if (previousValue === 0) return { direction: 'new', percentage: 0 };
    
    const diff = currentValue - previousValue;
    const percentage = Math.round((diff / previousValue) * 100);
    
    if (Math.abs(percentage) < 5) return { direction: 'stable', percentage: 0 };
    if (percentage > 0) return { direction: 'up', percentage };
    return { direction: 'down', percentage: Math.abs(percentage) };
};

export const getTutorDetailedStats = async (tutorId, period) => {
    try {
        const dateRange = getDateRange(period);
        
        const tutorDoc = await getDocs(query(collection(db, 'tutores'), where('__name__', '==', tutorId)));
        const salesSnap = await getDocs(query(
            collection(db, 'ventas_presenciales'),
            where('tutorInfo.id', '==', tutorId),
            where('createdAt', '>=', dateRange.current.start),
            where('createdAt', '<=', dateRange.current.end)
        ));
        const citasSnap = await getDocs(query(
            collection(db, 'citas'),
            where('tutorId', '==', tutorId),
            where('startTime', '>=', dateRange.current.start),
            where('startTime', '<=', dateRange.current.end)
        ));
        const groomingSnap = await getDocs(query(
            collection(db, 'turnos_peluqueria'),
            where('tutorId', '==', tutorId),
            where('startTime', '>=', dateRange.current.start),
            where('startTime', '<=', dateRange.current.end)
        ));
        const pacientesSnap = await getDocs(query(collection(db, 'pacientes'), where('tutorId', '==', tutorId)));

        const tutor = tutorDoc.docs[0]?.data();
        const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const citas = citasSnap.docs.map(doc => doc.data());
        const grooming = groomingSnap.docs.map(doc => doc.data());
        const patients = pacientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const productFrequency = {};
        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const key = item.name;
                productFrequency[key] = (productFrequency[key] || 0) + 1;
            });
        });

        const topProducts = Object.entries(productFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        return {
            tutor: { id: tutorId, name: tutor?.name, accountBalance: tutor?.accountBalance || 0 },
            sales: sales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
            citas,
            grooming,
            patients,
            topProducts,
            summary: {
                totalSpent: sales.reduce((sum, s) => sum + (s.total || 0), 0),
                purchaseCount: sales.length,
                citasCount: citas.length,
                groomingCount: grooming.length
            }
        };
    } catch (error) {
        console.error('Error fetching tutor detailed stats:', error);
        throw error;
    }
};

export const clearStatsCache = () => {
    statsCache.clear();
};

export const exportToCSV = (data, filename) => {
    const headers = ['Posición', 'Tutor', 'Gasto Total', 'Compras', 'Engagement', 'Última Compra', 'Especies'];
    const rows = data.map((item, index) => [
        index + 1,
        item.tutorName,
        `$${item.totalSpent.toFixed(2)}`,
        item.purchaseCount,
        item.engagementScore,
        item.lastPurchase ? item.lastPurchase.toDate().toLocaleDateString('es-AR') : 'N/A',
        item.species.join(', ')
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const getProductSalesHistory = async (searchTerm, dateRange) => {
    try {
        const { start, end } = dateRange;
        
        const salesQuery = query(
            collection(db, 'ventas_presenciales'),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );
        
        const salesSnap = await getDocs(salesQuery);
        const allSales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const matchingSales = [];
        const productStats = {
            totalQuantity: 0,
            totalRevenue: 0,
            prices: [],
            priceHistory: []
        };
        
        allSales.forEach(sale => {
            if (!sale.items || !Array.isArray(sale.items)) return;
            
            sale.items.forEach(item => {
                const itemName = (item.name || '').toLowerCase();
                const search = searchTerm.toLowerCase();
                
                if (itemName.includes(search)) {
                    const quantity = parseInt(item.quantity) || 0;
                    const price = parseFloat(item.price) || 0;
                    const itemTotal = quantity * price;
                    
                    matchingSales.push({
                        saleId: sale.id,
                        date: sale.createdAt,
                        tutorId: sale.tutorInfo?.id || null,
                        tutorName: sale.tutorInfo?.name || 'N/A',
                        patientId: sale.patientInfo?.id || null,
                        patientName: sale.patientInfo?.name || 'N/A',
                        productName: item.name,
                        quantity,
                        price,
                        originalPrice: item.originalPrice || price,
                        total: itemTotal,
                        source: item.source || 'N/A',
                        tipo: item.tipo || 'N/A'
                    });
                    
                    productStats.totalQuantity += quantity;
                    productStats.totalRevenue += itemTotal;
                    productStats.prices.push(price);
                    
                    productStats.priceHistory.push({
                        date: sale.createdAt,
                        price,
                        originalPrice: item.originalPrice || price
                    });
                }
            });
        });
        
        matchingSales.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        productStats.priceHistory.sort((a, b) => a.date.toMillis() - b.date.toMillis());
        
        const uniquePrices = [...new Set(productStats.prices)];
        
        return {
            sales: matchingSales,
            summary: {
                totalQuantity: productStats.totalQuantity,
                totalRevenue: productStats.totalRevenue,
                salesCount: matchingSales.length,
                avgPrice: productStats.prices.length > 0 
                    ? productStats.prices.reduce((a, b) => a + b, 0) / productStats.prices.length 
                    : 0,
                minPrice: uniquePrices.length > 0 ? Math.min(...uniquePrices) : 0,
                maxPrice: uniquePrices.length > 0 ? Math.max(...uniquePrices) : 0,
                priceVariations: uniquePrices.length
            },
            priceHistory: productStats.priceHistory
        };
        
    } catch (error) {
        console.error('Error fetching product sales history:', error);
        throw error;
    }
};

export const getDebtAccountsReport = async (dateRange) => {
    try {
        const { start, end } = dateRange;
        
        const salesQuery = query(
            collection(db, 'ventas_presenciales'),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );
        
        const cobrosQuery = query(
            collection(db, 'cobros_deuda'),
            where('createdAt', '>=', start),
            where('createdAt', '<=', end)
        );
        
        const [salesSnap, cobrosSnap, tutoresSnap] = await Promise.all([
            getDocs(salesQuery),
            getDocs(cobrosQuery),
            getDocs(collection(db, 'tutores'))
        ]);
        
        const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const cobros = cobrosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tutores = tutoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let deudaGenerada = 0;
        let deudaCobrada = 0;
        const movimientos = [];
        
        sales.forEach(sale => {
            const debt = parseFloat(sale.debt) || 0;
            if (debt > 0) {
                deudaGenerada += debt;
                movimientos.push({
                    type: 'deuda_generada',
                    date: sale.createdAt,
                    tutorId: sale.tutorInfo?.id,
                    tutorName: sale.tutorInfo?.name || 'N/A',
                    patientName: sale.patientInfo?.name || 'N/A',
                    amount: debt,
                    saleTotal: sale.total || 0,
                    saleId: sale.id
                });
            }
        });
        
        cobros.forEach(cobro => {
            const amount = parseFloat(cobro.amount) || 0;
            deudaCobrada += amount;
            movimientos.push({
                type: 'cobro',
                date: cobro.createdAt,
                tutorId: cobro.tutorId,
                tutorName: cobro.tutorName || 'N/A',
                patientName: cobro.patientName || 'N/A',
                amount,
                paymentMethod: cobro.paymentMethod || 'N/A',
                saleId: cobro.saleId
            });
        });
        
        movimientos.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        
        const deudores = tutores
            .filter(tutor => (tutor.accountBalance || 0) < 0)
            .map(tutor => {
                const tutorSales = sales.filter(s => s.tutorInfo?.id === tutor.id);
                const tutorCobros = cobros.filter(c => c.tutorId === tutor.id);
                
                const lastSale = tutorSales.length > 0 
                    ? tutorSales.reduce((latest, s) => 
                        s.createdAt.toMillis() > latest.createdAt.toMillis() ? s : latest
                    ) 
                    : null;
                
                const lastCobro = tutorCobros.length > 0 
                    ? tutorCobros.reduce((latest, c) => 
                        c.createdAt.toMillis() > latest.createdAt.toMillis() ? c : latest
                    ) 
                    : null;
                
                return {
                    tutorId: tutor.id,
                    tutorName: tutor.name,
                    phone: tutor.phone || 'N/A',
                    email: tutor.email || 'N/A',
                    accountBalance: tutor.accountBalance,
                    deudaActual: Math.abs(tutor.accountBalance),
                    lastSaleDate: lastSale ? lastSale.createdAt : null,
                    lastCobroDate: lastCobro ? lastCobro.createdAt : null,
                    salesInPeriod: tutorSales.length,
                    cobrosInPeriod: tutorCobros.length
                };
            })
            .sort((a, b) => a.accountBalance - b.accountBalance);
        
        const deudaPendienteTotal = deudores.reduce((sum, d) => sum + d.deudaActual, 0);
        
        return {
            summary: {
                deudaGenerada,
                deudaCobrada,
                deudaPendiente: deudaPendienteTotal,
                deudoresCount: deudores.length,
                salesWithDebt: sales.filter(s => (s.debt || 0) > 0).length,
                cobrosCount: cobros.length
            },
            deudores,
            movimientos
        };
        
    } catch (error) {
        console.error('Error fetching debt accounts report:', error);
        throw error;
    }
};