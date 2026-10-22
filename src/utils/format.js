// Formato numérico argentino: punto para miles y coma para decimales.
// Se usa 'de-DE' porque 'es-AR' omite el separador de miles en números de 4 cifras.
const LOCALE = 'de-DE';

const toNumber = (value) => {
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

export const formatNumber = (value, { min = 0, max = 2 } = {}) =>
    toNumber(value).toLocaleString(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: true });

// Siempre dos decimales (reemplaza a `.toFixed(2)` en valores que se muestran). No incluye el signo $.
export const formatDecimal = (value, decimals = 2) => formatNumber(value, { min: decimals, max: decimals });

export const formatMoney = (value, decimals = 2) => {
    const n = toNumber(value);
    return `${n < 0 ? '-' : ''}$${formatDecimal(Math.abs(n), decimals)}`;
};
