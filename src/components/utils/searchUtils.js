// Helpers para búsquedas y ordenamiento de listas grandes.

// Minúsculas y sin acentos: "González" → "gonzalez" (NFD separa la tilde y \p{M} la quita).
export const normalizeText = (value) =>
  (value == null ? "" : String(value)).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const onlyDigits = (value) => (value == null ? "" : String(value)).replace(/\D/g, "");

// Un término que solo tiene dígitos y separadores ("379 504-8310") se busca también contra los dígitos.
export const isNumericTerm = (term) => /^[\d\s\-+().]+$/.test(term) && onlyDigits(term).length >= 3;

// Instancia única: crear el collator en cada comparación (localeCompare) es lo que hace lento el sort.
export const esCollator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
