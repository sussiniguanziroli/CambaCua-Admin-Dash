// Misma colección (clinical_history) para ambos tipos. Las notas viejas no tienen `type` y se consideran clínicas.
// 'novedad' = comentario del tutor sobre la evolución de la mascota; no tiene peso clínico.
export const NOTE_TYPE_NOVEDAD = 'novedad';
export const NOTE_TYPE_CLINICA = 'clinica';
export const isNovedad = (note) => note?.type === NOTE_TYPE_NOVEDAD;
