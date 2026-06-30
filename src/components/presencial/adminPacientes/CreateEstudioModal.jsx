import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { getTiposEstudio, addTipoEstudio, deleteTipoEstudio } from '../../../services/estudioService';

const CreateEstudioModal = ({ isOpen, onClose, onSave }) => {
    const [tipos, setTipos] = useState([]);
    const [isLoadingTipos, setIsLoadingTipos] = useState(true);
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const [solicitadoPor, setSolicitadoPor] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [notas, setNotas] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Catálogo: alta inline
    const [showCatalog, setShowCatalog] = useState(false);
    const [newNombre, setNewNombre] = useState('');
    const [newDescripcion, setNewDescripcion] = useState('');
    const [isAddingTipo, setIsAddingTipo] = useState(false);

    const loadTipos = useCallback(async () => {
        setIsLoadingTipos(true);
        try { setTipos(await getTiposEstudio()); }
        catch (e) { console.error(e); }
        finally { setIsLoadingTipos(false); }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setSolicitadoPor('');
            setFecha(new Date().toISOString().split('T')[0]);
            setNotas('');
            setShowCatalog(false);
            setNewNombre('');
            setNewDescripcion('');
            loadTipos();
        }
    }, [isOpen, loadTipos]);

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleAddTipo = async () => {
        if (!newNombre.trim()) return;
        setIsAddingTipo(true);
        try {
            const created = await addTipoEstudio(newNombre, newDescripcion);
            setNewNombre('');
            setNewDescripcion('');
            await loadTipos();
            // Lo dejamos pre-seleccionado para la solicitud actual.
            setSelectedIds((prev) => new Set(prev).add(created.id));
        } catch (e) {
            Swal.fire('Error', 'No se pudo agregar el tipo de estudio.', 'error');
        } finally {
            setIsAddingTipo(false);
        }
    };

    const handleDeleteTipo = async (tipo) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar del catálogo?',
            text: `Se eliminará "${tipo.nombre}" del catálogo de estudios. Las solicitudes ya emitidas no se modifican.`,
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        try {
            await deleteTipoEstudio(tipo.id);
            setSelectedIds((prev) => { const next = new Set(prev); next.delete(tipo.id); return next; });
            await loadTipos();
        } catch (e) {
            Swal.fire('Error', 'No se pudo eliminar el tipo de estudio.', 'error');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const selectedTipos = tipos.filter((t) => selectedIds.has(t.id)).map((t) => ({ nombre: t.nombre, descripcion: t.descripcion || '' }));
        if (selectedTipos.length === 0) {
            Swal.fire('Atención', 'Seleccioná al menos un estudio.', 'warning');
            return;
        }
        setIsSubmitting(true);
        const estudioData = { tipos: selectedTipos, solicitadoPor, fecha, notas };
        Promise.resolve(onSave(estudioData)).finally(() => setIsSubmitting(false));
    };

    if (!isOpen) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content recipe-modal">
                <div className="modal-header">
                    <h3>Nueva Solicitud de Estudios</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="solicitadoPor">Solicitado por:</label>
                        <input id="solicitadoPor" type="text" value={solicitadoPor} onChange={(e) => setSolicitadoPor(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="fechaEstudio">Fecha:</label>
                        <input id="fechaEstudio" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                    </div>

                    <div className="estudios-catalog-header">
                        <h4>Estudios a solicitar</h4>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCatalog((s) => !s)}>
                            {showCatalog ? 'Ocultar catálogo' : 'Gestionar catálogo'}
                        </button>
                    </div>

                    {showCatalog && (
                        <div className="estudios-catalog-manager">
                            <div className="estudios-catalog-add">
                                <input type="text" placeholder="Nombre del estudio" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} />
                                <input type="text" placeholder="Descripción (opcional)" value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} />
                                <button type="button" className="add-line-btn" onClick={handleAddTipo} disabled={isAddingTipo || !newNombre.trim()}>
                                    <FaPlus /> {isAddingTipo ? 'Agregando...' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="estudios-tipos-list">
                        {isLoadingTipos ? (
                            <p>Cargando catálogo...</p>
                        ) : tipos.length === 0 ? (
                            <p className="no-results-message">No hay tipos de estudio. Agregá uno desde "Gestionar catálogo".</p>
                        ) : (
                            tipos.map((t) => (
                                <div key={t.id} className={`estudio-tipo-item ${selectedIds.has(t.id) ? 'selected' : ''}`}>
                                    <label className="estudio-tipo-label">
                                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                                        <span className="estudio-tipo-nombre">{t.nombre}</span>
                                        {t.descripcion && <span className="estudio-tipo-desc">{t.descripcion}</span>}
                                    </label>
                                    {showCatalog && (
                                        <button type="button" className="remove-line-btn" onClick={() => handleDeleteTipo(t)} title="Eliminar del catálogo">
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="notasEstudio">Notas / Indicaciones</label>
                        <textarea id="notasEstudio" value={notas} onChange={(e) => setNotas(e.target.value)} />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Solicitud'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEstudioModal;
