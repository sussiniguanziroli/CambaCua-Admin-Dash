// estudiosCatalogo.js
// Categorías ("perfiles") y catálogo sugerido de estudios complementarios, según la lista manuscrita de la doctora.
// Sin dependencias de Firebase: lo usan el modal de solicitud y el servicio que sincroniza `tipos_estudios`.

export const normalizeNombre = (value) =>
    (value == null ? '' : String(value)).normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

// Orden de aparición. `tambien`: estudios de otra categoría que se listan también acá (ej. el ecocardiograma
// figura en Ecografía y en Cardíaco; es un único estudio, se tilda una sola vez).
export const CATEGORIAS = [
    { nombre: 'Metabólico' },
    { nombre: 'Hepático' },
    { nombre: 'Minerales' },
    { nombre: 'Absorción' },
    { nombre: 'Pancreático' },
    { nombre: 'Sangre' },
    { nombre: 'Ecografía', tambien: ['ECOCARDIO'] },
    { nombre: 'Inmunológico / Hemoparásitos' },
    { nombre: 'Microbiología / Micología' },
    { nombre: 'Cardíaco' },
    { nombre: 'Abdomen' },
    { nombre: 'Osteoarticular' },
    { nombre: 'Renal' },
    { nombre: 'Adrenal' },
];

export const CATEGORIA_OTROS = 'Otros';

// `prequirurgico`: forma parte del botón "Prequirúrgico general". Es una propuesta editable desde
// "Gestionar catálogo" (la lista manuscrita no detalla qué incluye).
// Los nombres que ya existían en el catálogo inicial se mantienen tal cual para no duplicarlos.
export const CATALOGO_INICIAL = [
    { nombre: 'GLUCEMIA', categoria: 'Metabólico', prequirurgico: true },
    { nombre: 'INSULINA', categoria: 'Metabólico' },
    { nombre: 'LIPIDOGRAMA VETERINARIO', categoria: 'Metabólico' },
    { nombre: 'FRUCTOSAMINA', categoria: 'Metabólico' },
    { nombre: 'HbA1 GLICOSILADA', categoria: 'Metabólico' },

    { nombre: 'HEPATOGRAMA', categoria: 'Hepático', prequirurgico: true },
    { nombre: 'GGT', categoria: 'Hepático' },
    { nombre: 'ACETIL COLINESTERASA SÉRICA HEPÁTICA', categoria: 'Hepático' },
    { nombre: 'ÁCIDOS BILIARES', categoria: 'Hepático' },

    { nombre: 'CALCEMIA', categoria: 'Minerales' },
    { nombre: 'FOSFATEMIA', categoria: 'Minerales' },
    { nombre: 'MAGNESIO', categoria: 'Minerales' },
    { nombre: 'IONOGRAMA', categoria: 'Minerales' },

    { nombre: 'CIANOCOBALAMINA', categoria: 'Absorción' },
    { nombre: 'ÁCIDO FÓLICO', categoria: 'Absorción' },

    { nombre: 'LIPASA PANCREÁTICA', categoria: 'Pancreático' },
    { nombre: 'AMILASA PANCREÁTICA', categoria: 'Pancreático' },
    { nombre: 'TLI PANCREÁTICO CANINO', categoria: 'Pancreático' },

    { nombre: 'HEMOGRAMA', categoria: 'Sangre', prequirurgico: true },
    { nombre: 'PLAQUETAS', categoria: 'Sangre' },
    { nombre: 'COAGULOGRAMA', categoria: 'Sangre', prequirurgico: true },
    { nombre: 'PROTEÍNAS FRACCIONADAS', categoria: 'Sangre' },

    { nombre: 'ECOGRAFÍA ABDOMINAL', categoria: 'Ecografía' },
    { nombre: 'ECOGRAFÍA TORÁCICA', categoria: 'Ecografía' },

    { nombre: 'VIF / VILEF', categoria: 'Inmunológico / Hemoparásitos' },
    { nombre: 'FROTIS DE SANGRE CAPILAR', categoria: 'Inmunológico / Hemoparásitos' },
    { nombre: 'TEST DE LEISHMANIASIS', categoria: 'Inmunológico / Hemoparásitos' },
    { nombre: 'TEST DE EHRLICHIOSIS', categoria: 'Inmunológico / Hemoparásitos' },
    { nombre: 'TEST DE ANAPLASMOSIS', categoria: 'Inmunológico / Hemoparásitos' },

    { nombre: 'CULTIVO BACTERIOLÓGICO', categoria: 'Microbiología / Micología' },
    { nombre: 'ANTIBIOGRAMA', categoria: 'Microbiología / Micología' },
    { nombre: 'ANTIFUNGIGRAMA', categoria: 'Microbiología / Micología' },
    { nombre: 'AUTOVACUNA', categoria: 'Microbiología / Micología' },

    { nombre: 'PLACA DE TÓRAX (LLD - VD)', categoria: 'Cardíaco' },
    { nombre: 'ECG', categoria: 'Cardíaco' },
    { nombre: 'ECOCARDIO', categoria: 'Cardíaco' },

    { nombre: 'PLACA ABDOMINAL (LLD - VD)', categoria: 'Abdomen' },

    { nombre: 'PLACA OSTEOARTICULAR COMPLETA', categoria: 'Osteoarticular' },
    { nombre: 'PLACA VÉRTEBRAS CERVICALES', categoria: 'Osteoarticular' },
    { nombre: 'PLACA VÉRTEBRAS TORÁCICAS', categoria: 'Osteoarticular' },
    { nombre: 'PLACA VÉRTEBRAS LUMBOSACRAS', categoria: 'Osteoarticular' },
    { nombre: 'PLACA COLA', categoria: 'Osteoarticular' },
    { nombre: 'PLACA MIEMBRO ANTERIOR DERECHO', categoria: 'Osteoarticular' },
    { nombre: 'PLACA MIEMBRO ANTERIOR IZQUIERDO', categoria: 'Osteoarticular' },

    { nombre: 'UREA', categoria: 'Renal', prequirurgico: true },
    { nombre: 'CREATININA', categoria: 'Renal', prequirurgico: true },
    { nombre: 'ÁCIDO ÚRICO', categoria: 'Renal' },
    { nombre: 'SDMA', categoria: 'Renal' },
    { nombre: 'UPC EN ORINA', categoria: 'Renal' },
    { nombre: 'ORINA COMPLETA', categoria: 'Renal' },

    { nombre: 'CORTISOL', categoria: 'Adrenal' },
    { nombre: 'UPCC (CORTISOL EN ORINA)', categoria: 'Adrenal' },
    { nombre: 'CORTISOL EN ORINA 24 HS.', categoria: 'Adrenal' },
];
