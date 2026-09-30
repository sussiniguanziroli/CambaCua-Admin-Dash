# Revisión de consumo de Firestore — 30/09/2026

El usuario reporta un salto de aproximadamente USD 1 a USD 17 mensuales, atribuible a Firestore, y confirma que solo esta aplicación usa la base. Esta revisión del repositorio identifica operaciones evitables; no permite atribuir el importe sin métricas de producción y desglose por SKU (lecturas, escrituras, almacenamiento y transferencia).

## Corregido localmente

| Problema | Impacto anterior | Corrección |
| --- | --- | --- |
| `ResumenSemanal.jsx` disparaba rankings en cualquier pestaña distinta de resumen | Abrir mensual, productos o cuentas iniciaba un análisis clínico de seis meses que esas vistas no utilizaban | Ejecutar solamente en perros, gatos y comparativa |
| `calculateAllTopCustomers` descargaba tutores y pacientes completos | Costo proporcional a todo el padrón, aunque pocos clientes compraran en el período | Consultar IDs activos y pacientes de esos tutores mediante `in`, en lotes de hasta 30 |
| `getDebtAccountsReport` descargaba todos los tutores | Se descartaban localmente los que no debían | Filtrar `accountBalance < 0` en Firestore |
| `liveCollectionStore` nunca llamaba a unsubscribe | Tutores y pacientes seguían recibiendo cambios después de abandonar las vistas | Cerrar el listener al salir el último consumidor y limpiar la memoria de la vista |
| Reglas locales abiertas hasta 2060 | Si estaban desplegadas, cualquier cliente podía leer/escribir sin autenticación | Autorizar únicamente los tres UID existentes en Login.jsx; agregar referencia a reglas en firebase.json |

El ranking anterior leía ventas del período actual y anterior, todos los tutores, todos los pacientes, citas y peluquería; además hacía tres consultas por paciente activo (historia, recetas y vencimientos). Con 1.000 pacientes activos, son 3.000 consultas adicionales por cálculo, incluso si muchas están vacías. La caché del ranking dura 10 minutos en memoria y se pierde al recargar. Esto es un ejemplo de amplificación, no una medición del proyecto.

La pestaña mensual aparece en el commit `ee69e5e`, del 05/06/2026. Conviene contrastar su uso con el comienzo del aumento; no constituye prueba de causalidad.

## Pendiente de optimización

- Tutores y pacientes: la paginación visual de 12 filas todavía descarga la colección completa. El cierre de listeners evita actividad posterior, pero no elimina el costo de la carga inicial o de futuras reconexiones. Una paginación real debe preservar búsqueda por fragmentos, teléfono, DNI y filtros; agregar un `limit` aislado perdería resultados.
- `PedidosCompletados.jsx`: descarga todo el historial y filtra fechas en el navegador. Migrar a rango de fechas en servidor y cursores, contemplando `fechaCompletado` y `fechaCancelacion`.
- `ReporteDeudoresModal.jsx`: lee todos los tutores y todas las ventas con deuda; las fechas se filtran después. Consultar por período y cargar solo tutores de los resultados.
- Selectores de venta, altas y transferencias: vuelven a descargar tutores o catálogos completos al montar. Requieren búsqueda acotada o caché con invalidación tras altas y ediciones.
- Perfiles de tutor/paciente: traen históricos completos y varias acciones vuelven a cargar todos los datos. Separar cargas por sección y paginar los históricos sin truncar saldos o informes.
- Ranking solicitado explícitamente: aún ejecuta tres consultas por paciente activo. Evaluar agregados mantenidos al escribir, o consultas agrupadas con índices, midiendo volumen real.
- Cloud Function de cupones: consulta diaria filtrada, pero usa un único batch. Si supera el límite de operaciones permitido puede fallar y volver a leer los mismos pendientes al día siguiente; conviene procesar lotes acotados. No se encontró evidencia de que explique el aumento.

No se encontraron intervalos de polling en `src`. Los únicos `onSnapshot` encontrados están en el store compartido. Los monitores clínico y de vencimientos ya usan cursores con páginas de 25 y 20 documentos respectivamente.

## Validación y publicación

- `npm run build`: correcto; advertencias de tamaño de bundles/importaciones mixtas ajenas a Firestore.
- `node --experimental-vm-modules --test tests/firestore-costs.test.mjs`: tres pruebas aprobadas, con Firebase simulado. Cubren compartir/cerrar/reabrir listeners, lotes de 30 con resultados del ranking y reporte de deudores.
- `git diff --check`: correcto.
- No se consultaron documentos de producción ni se desplegaron cambios. No se ejecutó el emulador de reglas; las reglas desplegadas y el acceso real siguen sin verificar.
- Publicar el frontend por el flujo de Netlify del proyecto y desplegar las reglas separadamente con `firebase deploy --only firestore:rules --project cambacuavet-d3dfc`. Verificar que los tres UID de Login.jsx sean los administradores actuales antes de desplegar reglas.
- Agregar o quitar administradores requiere actualizar tanto Login.jsx como firestore.rules.

## Confirmar el origen y el efecto

1. En facturación de Google Cloud, seleccionar el mes afectado, filtrar Cloud Firestore y agrupar por SKU. Comparar contra un mes de USD 1 para separar lecturas, escrituras, almacenamiento y transferencia.
2. En uso de Firestore, comparar lecturas y escrituras diarias alrededor del aumento y de la publicación. Registrar fecha/hora del despliegue y volumen de uso comparable.
3. Verificar las reglas realmente desplegadas. La presencia del archivo local no prueba que producción usara esas reglas; antes firebase.json ni siquiera las referenciaba.
4. Confirmar que abrir mensual/productos/cuentas ya no dispara las consultas del ranking, y que abandonar tutores/pacientes cierra sus listeners.
5. Revisar volumen de documentos y tamaño de colecciones sin escanearlas repetidamente: la propia inspección de datos puede generar lecturas.

No hay una estimación fiable del ahorro en dólares con los datos disponibles.

Referencias: [facturación de Firestore](https://firebase.google.com/docs/firestore/pricing), [límites de consultas](https://firebase.google.com/docs/firestore/query-data/queries), [reglas superpuestas](https://firebase.google.com/docs/firestore/security/rules-structure). La persistencia local no vuelve gratuitas todas las lecturas: las consultas y reconexiones pueden facturarse, y una consulta vacía tiene un cargo mínimo de lectura.
