import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

// Aislamos Firebase para verificar consultas y suscripciones sin leer producción.
async function loadService(file, dependencies) {
    const source = await readFile(new URL(`../src/services/${file}`, import.meta.url), 'utf8');
    const module = new SourceTextModule(source);
    await module.link((specifier) => {
        const exports = dependencies[specifier];
        assert.ok(exports, `Dependencia inesperada: ${specifier}`);
        return new SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
        });
    });
    await module.evaluate();
    return module.namespace;
}

test('comparte un listener y lo cierra al salir del último consumidor; reinicia sin datos anteriores', async () => {
    const streams = [];
    const service = await loadService('liveCollectionStore.js', {
        react: {
            useCallback: fn => fn,
            useSyncExternalStore: (subscribe, getSnapshot) => ({ subscribe, getSnapshot }),
        },
        'firebase/firestore': {
            collection: (_, name) => name,
            onSnapshot: (name, options, next, error) => {
                const stream = { name, next, error, closed: false };
                streams.push(stream);
                return () => { stream.closed = true; };
            },
        },
        '../firebase/config': { db: {} },
    });
    const first = service.useLiveCollection('tutores');
    const second = service.useLiveCollection('tutores');
    const stopFirst = first.subscribe(() => {});
    const stopSecond = second.subscribe(() => {});
    assert.equal(streams.length, 1);
    streams[0].next({
        metadata: { fromCache: false }, empty: false,
        docChanges: () => [{}], docs: [{ id: 'a', data: () => ({ name: 'Ana' }) }],
    });
    assert.equal(first.getSnapshot().docs.length, 1);
    stopFirst();
    assert.equal(streams[0].closed, false);
    stopSecond();
    assert.equal(streams[0].closed, true);
    assert.equal(first.getSnapshot().docs.length, 0);
    const stopAgain = first.subscribe(() => {});
    assert.equal(streams.length, 2);
    streams[1].next({ metadata: { fromCache: false }, empty: true, docChanges: () => [], docs: [] });
    assert.equal(first.getSnapshot().isLoading, false);
    assert.equal(first.getSnapshot().docs.length, 0);
    stopAgain();
});

const stamp = date => ({ toMillis: () => date.getTime(), toDate: () => date });
const document = (id, data) => ({ id, data: () => data });

test('ranking consulta solamente IDs activos en lotes de hasta 30 y conserva los resultados', async () => {
    const queries = [];
    const ids = Array.from({ length: 31 }, (_, i) => `t${i}`);
    const now = stamp(new Date());
    let salesRead = 0;
    const service = await loadService('statsService.js', {
        '../firebase/config': { db: {} },
        'firebase/firestore': {
            collection: (_, name) => name,
            documentId: () => '__name__',
            query: (name, ...filters) => ({ name, filters }),
            where: (field, op, value) => ({ field, op, value }),
            Timestamp: { fromDate: stamp },
            getDocs: async q => {
                queries.push(q);
                let docs = [];
                if (q.name === 'ventas_presenciales' && salesRead++ === 0) {
                    docs = ids.map(id => document(`sale-${id}`, { tutorInfo: { id }, total: 100, createdAt: now }));
                }
                if (q.name === 'tutores') {
                    assert.equal(q.filters[0].field, '__name__');
                    docs = q.filters[0].value.map(id => document(id, { name: id }));
                }
                if (q.name === 'pacientes') {
                    assert.equal(q.filters[0].field, 'tutorId');
                    if (q.filters[0].value.includes('t0')) docs = [document('p0', { tutorId: 't0', species: 'Canino' })];
                }
                return { docs };
            },
        },
    });
    const result = await service.calculateAllTopCustomers('6months');
    for (const name of ['tutores', 'pacientes']) {
        const matches = queries.filter(q => q.name === name);
        assert.deepEqual(matches.map(q => q.filters[0].value.length), [30, 1]);
        assert.ok(matches.every(q => q.filters[0].op === 'in'));
    }
    assert.equal(result.all.length, 1);
    assert.equal(result.all[0].tutorId, 't0');
    assert.equal(result.all[0].totalSpent, 100);
    assert.equal(result.bySpecies.Canino.bySpent.length, 1);
    const count = queries.length;
    await service.calculateAllTopCustomers('6months');
    assert.equal(queries.length, count, 'Reutiliza el ranking vigente');
});

test('cuentas consulta solo tutores deudores y conserva el saldo agregado', async () => {
    const service = await loadService('statsService.js', {
        '../firebase/config': { db: {} },
        'firebase/firestore': {
            collection: (_, name) => name,
            documentId: () => '__name__',
            query: (name, ...filters) => ({ name, filters }),
            where: (field, op, value) => ({ field, op, value }),
            Timestamp: { fromDate: stamp },
            getDocs: async q => {
                if (q.name !== 'tutores') return { docs: [] };
                assert.deepEqual(q.filters, [{ field: 'accountBalance', op: '<', value: 0 }]);
                return { docs: [document('t0', { name: 'Ana', accountBalance: -200 })] };
            },
        },
    });
    const result = await service.getDebtAccountsReport({ start: stamp(new Date()), end: stamp(new Date()) });
    assert.equal(result.summary.deudaPendiente, 200);
    assert.equal(result.summary.deudoresCount, 1);
});
