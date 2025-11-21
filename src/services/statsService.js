import { db } from '../firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

const CACHE_DURATION = 10 * 60 * 1000;
let statsCache = new Map();
const BATCH_SIZE = 20;

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

const fetchInBatches = async (patientIds, fetchFunction, progressCallback, baseProgress, progressRange) => {
    const results = [];
    const totalBatches = Math.ceil(patientIds.length / BATCH_SIZE);
    
    for (let i = 0; i < patientIds.length; i += BATCH_SIZE) {
        const batch = patientIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(patientId => fetchFunction(patientId))
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
        
        if (i + BATCH_SIZE < patientIds.length) {
            await sleep(100);
        }
    }
    
    return results;
};

export const calculateTopCustomers = async (speciesFilter, period, limit = 10, onProgress) => {
    const cacheKey = `${speciesFilter}-${period}-${limit}`;
    
    if (statsCache.has(cacheKey)) {
        const cached = statsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            if (onProgress) onProgress({ step: 'complete', progress: 100, message: 'Datos en caché' });
            return cached.data;
        }
    }

    try {
        if (onProgress) onProgress({ step: 'tutores', progress: 5, message: 'Cargando tutores...' });
        
        const tutoresSnap = await getDocs(collection(db, 'tutores'));
        const tutores = tutoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (onProgress) onProgress({ step: 'pacientes', progress: 10, message: 'Cargando pacientes...' });
        
        const pacientesSnap = await getDocs(collection(db, 'pacientes'));
        const allPacientes = pacientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const tutorPatientsMap = new Map();
        allPacientes.forEach(p => {
            if (!p.tutorId) return;
            if (!tutorPatientsMap.has(p.tutorId)) {
                tutorPatientsMap.set(p.tutorId, []);
            }
            tutorPatientsMap.get(p.tutorId).push(p);
        });

        if (onProgress) onProgress({ step: 'ventas', progress: 15, message: 'Analizando ventas...' });
        
        const dateRange = getDateRange(period);
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

        if (onProgress) onProgress({ step: 'citas', progress: 20, message: 'Analizando citas...' });
        
        const citasQuery = query(
            collection(db, 'citas'),
            where('startTime', '>=', dateRange.current.start),
            where('startTime', '<=', dateRange.current.end)
        );
        const citasSnap = await getDocs(citasQuery);
        const allCitas = citasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const groomingQuery = query(
            collection(db, 'turnos_peluqueria'),
            where('startTime', '>=', dateRange.current.start),
            where('startTime', '<=', dateRange.current.end)
        );
        const groomingSnap = await getDocs(groomingQuery);
        const allGrooming = groomingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (onProgress) onProgress({ step: 'engagement', progress: 25, message: 'Preparando carga de datos clínicos...' });

        const patientIds = allPacientes.map(p => p.id);

        if (onProgress) onProgress({ step: 'engagement', progress: 30, message: 'Cargando historias clínicas...' });
        
        const historiasData = await fetchInBatches(
            patientIds,
            (patientId) => getDocs(collection(db, `pacientes/${patientId}/clinical_history`))
                .then(snap => ({ patientId, docs: snap.docs }))
                .catch(() => ({ patientId, docs: [] })),
            onProgress,
            30,
            15
        );

        if (onProgress) onProgress({ step: 'engagement', progress: 45, message: 'Cargando recetas...' });
        
        const recetasData = await fetchInBatches(
            patientIds,
            (patientId) => getDocs(collection(db, `pacientes/${patientId}/clinical_recipes`))
                .then(snap => ({ patientId, docs: snap.docs }))
                .catch(() => ({ patientId, docs: [] })),
            onProgress,
            45,
            15
        );

        if (onProgress) onProgress({ step: 'engagement', progress: 60, message: 'Cargando vencimientos...' });
        
        const vencimientosData = await fetchInBatches(
            patientIds,
            (patientId) => getDocs(query(
                collection(db, `pacientes/${patientId}/vencimientos`),
                where('dueDate', '>=', dateRange.current.start)
            ))
            .then(snap => ({ patientId, docs: snap.docs }))
            .catch(() => ({ patientId, docs: [] })),
            onProgress,
            60,
            15
        );

        if (onProgress) onProgress({ step: 'processing', progress: 75, message: 'Organizando datos...' });

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

        if (onProgress) onProgress({ step: 'calculating', progress: 80, message: 'Calculando rankings...' });

        const tutorStats = [];
        
        for (let i = 0; i < tutores.length; i++) {
            const tutor = tutores[i];
            const tutorPatients = tutorPatientsMap.get(tutor.id) || [];
            
            if (tutorPatients.length === 0) continue;

            const patientSpecies = [...new Set(tutorPatients.map(p => p.species))];
            
            if (speciesFilter !== 'all') {
                const hasMatchingSpecies = patientSpecies.some(s => {
                    if (speciesFilter === 'Canino') return s === 'Canino' || s?.toLowerCase().includes('perro');
                    if (speciesFilter === 'Felino') return s === 'Felino' || s?.toLowerCase().includes('gato');
                    return false;
                });
                if (!hasMatchingSpecies) continue;
            }

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
                vencimientos.forEach(doc => {
                    const weight = doc.data().supplied ? 1.5 : 1.5;
                    engagementScore += weight;
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

        if (onProgress) onProgress({ step: 'complete', progress: 100, message: 'Completado!' });

        const result = {
            bySpent: [...tutorStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit),
            byFrequency: [...tutorStats].sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, limit),
            byEngagement: [...tutorStats].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, limit),
            all: tutorStats
        };

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