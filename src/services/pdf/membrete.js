// membrete.js
// Membrete de la Dra. María Celeste Guanziroli Stefani (encabezado y pie) dibujado con jsPDF,
// replicando el papel impreso del consultorio. Todas las medidas son proporcionales al ancho de la
// página, así que funciona igual en A4 o A5. No usa APIs del navegador (se puede probar en Node).

export const MEMBRETE = {
    profesional: 'María Celeste Guanziroli Stefani',
    titulo: 'MÉDICA VETERINARIA',
    grado: 'Dra. en Cs. Veterinarias - U.N.N.E.',
    matricula: 'MP. 0713',
    local: 'Cambá Cuá Vetshop & Spa',
    direccion: 'Entre Ríos 1581 (3400) Corrientes, Argentina',
    facebook: 'cambacuavet',
    whatsapp: '379 5048310',
};

// Great Vibes (SIL Open Font License) — src/assets/fonts/GreatVibes-Regular.ttf
const SCRIPT_FONT = 'GreatVibes';
const SCRIPT_FONT_FILE = 'GreatVibes-Regular.ttf';
const INK = [45, 45, 45];

// Íconos de Font Awesome (CC BY 4.0), viewBox 0 0 448 512 — los mismos que trae react-icons.
const ICON_FACEBOOK = 'M400 32H48A48 48 0 0 0 0 80v352a48 48 0 0 0 48 48h137.25V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.27c-30.81 0-40.42 19.12-40.42 38.73V256h68.78l-11 71.69h-57.78V480H400a48 48 0 0 0 48-48V80a48 48 0 0 0-48-48z';
const ICON_WHATSAPP = 'M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z';
const ICON_VIEWBOX = { width: 448, height: 512 };

export const registerScriptFont = (doc, base64) => {
    doc.addFileToVFS(SCRIPT_FONT_FILE, base64);
    doc.addFont(SCRIPT_FONT_FILE, SCRIPT_FONT, 'normal');
};

// Área útil de la página entre encabezado y pie.
export const getMembreteLayout = (doc) => {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    return { marginX: W * 0.095, contentTop: W * 0.4, contentBottom: H - W * 0.27 };
};

// Tamaño de fuente para que `text` ocupe `targetWidth` con la fuente actual.
const fitFontSize = (doc, text, targetWidth) => {
    doc.setFontSize(10);
    return Math.round(((10 * targetWidth) / doc.getTextWidth(text)) * 2) / 2;
};

const setScriptFont = (doc) => {
    if (doc.getFontList()[SCRIPT_FONT]) doc.setFont(SCRIPT_FONT, 'normal');
    else doc.setFont('times', 'italic'); // si la fuente no pudo cargarse
};

// --- SVG path → operadores de path de jsPDF (M L H V C S A Z, absolutos y relativos) ---

// Arco elíptico SVG convertido a curvas cúbicas (SVG 1.1, apéndice F.6.5).
const arcToCubics = (x1, y1, rx, ry, angleDeg, largeArc, sweep, x2, y2) => {
    if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
    const phi = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(phi), sin = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const coef = (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
    const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
    const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
    const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
    const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry;
    const theta1 = angle(1, 0, ux, uy);
    let delta = angle(ux, uy, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    else if (sweep && delta < 0) delta += 2 * Math.PI;

    const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
    const step = delta / segments;
    const k = (4 / 3) * Math.tan(step / 4);
    const point = (t) => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
    const tangent = (t) => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
    const curves = [];
    for (let s = 0; s < segments; s++) {
        const t1 = theta1 + s * step, t2 = t1 + step;
        const [p1x, p1y] = point(t1), [p2x, p2y] = point(t2);
        const [d1x, d1y] = tangent(t1), [d2x, d2y] = tangent(t2);
        curves.push([p1x + k * d1x, p1y + k * d1y, p2x - k * d2x, p2y - k * d2y, p2x, p2y]);
    }
    return curves;
};

const PATH_TOKENS = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g;

// Dibuja y rellena un path SVG con su esquina superior izquierda en (x, y) y `height` de alto.
const drawSvgIcon = (doc, d, x, y, height) => {
    const scale = height / ICON_VIEWBOX.height;
    const X = (px) => x + px * scale;
    const Y = (py) => y + py * scale;
    const tokens = d.match(PATH_TOKENS);
    let i = 0, cmd = '';
    let cx = 0, cy = 0, startX = 0, startY = 0;
    let ctrlX = null, ctrlY = null; // segundo punto de control de la última cúbica (para S)
    const n = () => parseFloat(tokens[i++]);
    const cubic = (x1, y1, x2, y2, x3, y3) => {
        doc.curveTo(X(x1), Y(y1), X(x2), Y(y2), X(x3), Y(y3));
        ctrlX = x2; ctrlY = y2; cx = x3; cy = y3;
    };

    while (i < tokens.length) {
        if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
        const rel = cmd === cmd.toLowerCase();
        const ox = rel ? cx : 0, oy = rel ? cy : 0;
        switch (cmd.toUpperCase()) {
            case 'M':
                cx = ox + n(); cy = oy + n(); startX = cx; startY = cy;
                doc.moveTo(X(cx), Y(cy));
                cmd = rel ? 'l' : 'L'; // pares extra después de M son líneas
                ctrlX = null;
                break;
            case 'L': cx = ox + n(); cy = oy + n(); doc.lineTo(X(cx), Y(cy)); ctrlX = null; break;
            case 'H': cx = ox + n(); doc.lineTo(X(cx), Y(cy)); ctrlX = null; break;
            case 'V': cy = oy + n(); doc.lineTo(X(cx), Y(cy)); ctrlX = null; break;
            case 'C': cubic(ox + n(), oy + n(), ox + n(), oy + n(), ox + n(), oy + n()); break;
            case 'S': {
                const x1 = ctrlX === null ? cx : 2 * cx - ctrlX;
                const y1 = ctrlY === null ? cy : 2 * cy - ctrlY;
                cubic(x1, y1, ox + n(), oy + n(), ox + n(), oy + n());
                break;
            }
            case 'A': {
                const [rx, ry, rot, large, sweep] = [n(), n(), n(), n(), n()];
                const ex = ox + n(), ey = oy + n();
                arcToCubics(cx, cy, rx, ry, rot, large, sweep, ex, ey).forEach((c) => cubic(...c));
                ctrlX = null;
                break;
            }
            case 'Z': doc.close(); cx = startX; cy = startY; ctrlX = null; break;
            default: throw new Error(`Comando SVG no soportado: ${cmd}`);
        }
    }
    doc.fill();
};

// --- Encabezado y pie ---

export const drawMembrete = (doc) => {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const center = W / 2;
    doc.setTextColor(...INK);
    doc.setDrawColor(...INK);
    doc.setFillColor(...INK);

    // Encabezado
    setScriptFont(doc);
    doc.setFontSize(fitFontSize(doc, MEMBRETE.profesional, W * 0.7));
    doc.text(MEMBRETE.profesional, center, W * 0.16, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fitFontSize(doc, MEMBRETE.titulo, W * 0.23));
    doc.text(MEMBRETE.titulo, center, W * 0.235, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fitFontSize(doc, MEMBRETE.grado, W * 0.4));
    doc.text(MEMBRETE.grado, center, W * 0.266, { align: 'center' });

    doc.setFontSize(fitFontSize(doc, MEMBRETE.matricula, W * 0.075));
    doc.text(MEMBRETE.matricula, center, W * 0.293, { align: 'center' });

    // Pie
    setScriptFont(doc);
    doc.setFontSize(fitFontSize(doc, MEMBRETE.local, W * 0.42));
    doc.text(MEMBRETE.local, center, H - W * 0.2, { align: 'center' });

    doc.setLineWidth(0.8);
    doc.line(center - W * 0.405, H - W * 0.17, center + W * 0.405, H - W * 0.17);

    doc.setFont('helvetica', 'normal');
    const footerSize = fitFontSize(doc, MEMBRETE.direccion, W * 0.55);
    doc.setFontSize(footerSize);
    doc.text(MEMBRETE.direccion, center, H - W * 0.128, { align: 'center' });

    // "Facebook: cambacuavet [f]   Whatsapp: 379 5048310 [wa]" centrado como una sola línea
    const facebookText = `Facebook: ${MEMBRETE.facebook}`;
    const whatsappText = `Whatsapp: ${MEMBRETE.whatsapp}`;
    const iconHeight = footerSize * 1.2;
    const iconWidth = (iconHeight * ICON_VIEWBOX.width) / ICON_VIEWBOX.height;
    const gap = footerSize * 0.35;
    const totalWidth = doc.getTextWidth(facebookText) + gap + iconWidth + gap * 3 + doc.getTextWidth(whatsappText) + gap + iconWidth;
    const baseline = H - W * 0.09;
    // El glifo ocupa y 32..480 del viewBox: su borde inferior queda apenas bajo la línea base.
    const iconTop = baseline + footerSize * 0.12 - (iconHeight * 480) / ICON_VIEWBOX.height;

    let x = center - totalWidth / 2;
    doc.text(facebookText, x, baseline);
    x += doc.getTextWidth(facebookText) + gap;
    drawSvgIcon(doc, ICON_FACEBOOK, x, iconTop, iconHeight);
    x += iconWidth + gap * 3;
    doc.text(whatsappText, x, baseline);
    x += doc.getTextWidth(whatsappText) + gap;
    drawSvgIcon(doc, ICON_WHATSAPP, x, iconTop, iconHeight);
};
