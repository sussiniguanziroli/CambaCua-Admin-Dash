import { useMemo, useState, useEffect, useRef } from 'react';
import { FaTrash, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { CATEGORIAS, CATEGORIA_OTROS, normalizeNombre } from '../../../services/estudiosCatalogo';

// Checkbox de grupo con estado intermedio (algunos estudios del perfil tildados).
const GroupCheckbox = ({ checked, indeterminate, onChange, label }) => {
    const ref = useRef(null);
    useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
    return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} onClick={(e) => e.stopPropagation()} aria-label={label} />;
};

const matches = (tipo, term) =>
    !term || normalizeNombre(tipo.nombre).includes(term) || normalizeNombre(tipo.descripcion).includes(term);

// Lista de estudios agrupada por categoría ("perfiles"). Tildar el encabezado de un perfil selecciona todos
// sus estudios; cada estudio se puede destildar o agregar después. `Prequirúrgico general` es un atajo.
const EstudiosCatalogoPicker = ({ tipos, selectedIds, onSelectionChange, managing = false, onDeleteTipo, onUpdateTipo }) => {
    const [search, setSearch] = useState('');
    const [openGroups, setOpenGroups] = useState(() => new Set());
    const term = normalizeNombre(search);

    const groups = useMemo(() => {
        const conocidas = new Set(CATEGORIAS.map((c) => c.nombre));
        const definidas = CATEGORIAS.map((c) => {
            const tambien = new Set((c.tambien || []).map(normalizeNombre));
            return { nombre: c.nombre, items: tipos.filter((t) => t.categoria === c.nombre || tambien.has(normalizeNombre(t.nombre))) };
        });
        const otros = { nombre: CATEGORIA_OTROS, items: tipos.filter((t) => !conocidas.has(t.categoria)) };
        return [...definidas, otros].filter((g) => g.items.length > 0);
    }, [tipos]);

    const visibleGroups = useMemo(
        () => groups.map((g) => ({ ...g, visibles: g.items.filter((t) => matches(t, term)) })).filter((g) => g.visibles.length > 0),
        [groups, term]
    );

    const preqx = useMemo(() => tipos.filter((t) => t.prequirurgico), [tipos]);
    const preqxSelected = preqx.filter((t) => selectedIds.has(t.id)).length;
    const preqxAll = preqx.length > 0 && preqxSelected === preqx.length;

    const changeSelection = (ids, select) => {
        const next = new Set(selectedIds);
        ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
        onSelectionChange(next);
    };

    const toggleOne = (id) => changeSelection([id], !selectedIds.has(id));
    const toggleOpen = (nombre) => setOpenGroups((prev) => { const next = new Set(prev); if (next.has(nombre)) next.delete(nombre); else next.add(nombre); return next; });
    const visibleIds = visibleGroups.flatMap((g) => g.visibles.map((t) => t.id));

    return (
        <div className="estudios-picker">
            {preqx.length > 0 && (
                <div className="estudios-preset">
                    <button type="button" className={`estudios-preset-btn ${preqxAll ? 'active' : ''}`} onClick={() => changeSelection(preqx.map((t) => t.id), !preqxAll)}>
                        Prequirúrgico general <span>{preqxSelected}/{preqx.length}</span>
                    </button>
                    <span className="estudios-preset-hint">Después podés quitar o agregar estudios.</span>
                </div>
            )}

            <div className="estudios-tipos-toolbar">
                <input type="text" className="estudios-tipos-search" placeholder="Buscar estudio..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="estudios-tipos-shortcuts">
                    <button type="button" className="link-btn" onClick={() => changeSelection(visibleIds, true)} disabled={visibleIds.length === 0}>Seleccionar todos</button>
                    <button type="button" className="link-btn" onClick={() => onSelectionChange(new Set())} disabled={selectedIds.size === 0}>Limpiar selección</button>
                </div>
            </div>

            <div className="estudios-groups">
                {tipos.length === 0 ? (
                    <p className="no-results-message">No hay tipos de estudio. Agregá uno desde &quot;Gestionar catálogo&quot;.</p>
                ) : visibleGroups.length === 0 ? (
                    <p className="no-results-message">No hay estudios que coincidan con &quot;{search}&quot;.</p>
                ) : visibleGroups.map((g) => {
                    const ids = g.visibles.map((t) => t.id);
                    const count = ids.filter((id) => selectedIds.has(id)).length;
                    const isOpen = term ? true : openGroups.has(g.nombre);
                    return (
                        <div key={g.nombre} className={`estudios-group ${isOpen ? 'open' : ''} ${count > 0 ? 'has-selection' : ''}`}>
                            <div className="estudios-group-header" role="button" tabIndex={0} onClick={() => toggleOpen(g.nombre)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(g.nombre); } }}>
                                <GroupCheckbox label={`Seleccionar perfil ${g.nombre}`} checked={count === ids.length} indeterminate={count > 0 && count < ids.length}
                                    onChange={() => changeSelection(ids, count !== ids.length)} />
                                <span className="estudios-group-name">{g.nombre}</span>
                                <span className="estudios-group-count">{count}/{ids.length}</span>
                                {isOpen ? <FaChevronDown className="estudios-group-chevron" /> : <FaChevronRight className="estudios-group-chevron" />}
                            </div>
                            {isOpen && (
                                <div className="estudios-group-items">
                                    {g.visibles.map((t) => (
                                        <div key={t.id} className={`estudio-tipo-item ${selectedIds.has(t.id) ? 'selected' : ''}`}>
                                            <label className="estudio-tipo-label">
                                                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleOne(t.id)} />
                                                <span className="estudio-tipo-nombre">{t.nombre}</span>
                                                {t.descripcion && <span className="estudio-tipo-desc">{t.descripcion}</span>}
                                            </label>
                                            {managing && (
                                                <div className="estudio-tipo-manage">
                                                    <select value={CATEGORIAS.some((c) => c.nombre === t.categoria) ? t.categoria : ''} title="Categoría"
                                                        onChange={(e) => onUpdateTipo(t, { categoria: e.target.value })}>
                                                        <option value="">Otros</option>
                                                        {CATEGORIAS.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                                                    </select>
                                                    <label className="estudio-tipo-preqx" title="Incluir en Prequirúrgico general">
                                                        <input type="checkbox" checked={!!t.prequirurgico} onChange={(e) => onUpdateTipo(t, { prequirurgico: e.target.checked })} /> Pre-qx
                                                    </label>
                                                    <button type="button" className="remove-line-btn" onClick={() => onDeleteTipo(t)} title="Eliminar del catálogo"><FaTrash /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EstudiosCatalogoPicker;
