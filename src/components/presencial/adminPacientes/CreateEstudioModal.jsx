import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaSync } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { getTiposEstudio, addTipoEstudio, deleteTipoEstudio, updateTipoEstudio, aplicarCatalogoCategorizado } from '../../../services/estudioService';
import { CATEGORIAS, normalizeNombre } from '../../../services/estudiosCatalogo';
import { MEMBRETE } from '../../../services/pdf/membrete';
import { DATOS_PACIENTE_VACIOS } from '../../../services/pdf/estudioPdf';
import EstudiosCatalogoPicker from './EstudiosCatalogoPicker';

const CAMPOS_DATOS = [
    { name: 'pacienteNombre', label: 'Paciente', required: true },
    { name: 'tutorNombre', label: 'Tutor' },
    { name: 'especie', label: 'Especie' },
    { name: 'raza', label: 'Raza' },
    { name: 'sexo', label: 'Sexo' },
    { name: 'edad', label: 'Edad' },
    { name: 'telefono', label: 'Teléfono móvil', type: 'tel' },
];

// datosIniciales: datos del perfil desde el que se abre (paciente + tutor), editables antes de guardar.
const CreateEstudioModal = ({ isOpen, onClose, onSave, datosIniciales }) => {
    const [tipos, setTipos] = useState([]);
    const [isLoadingTipos, setIsLoadingTipos] = useState(true);
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const [datos, setDatos] = useState(DATOS_PACIENTE_VACIOS);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [diagnostico, setDiagnostico] = useState('');
    const [notas, setNotas] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Catálogo: alta inline
    const [showCatalog, setShowCatalog] = useState(false);
    const [newNombre, setNewNombre] = useState('');
    const [newDescripcion, setNewDescripcion] = useState('');
    const [newCategoria, setNewCategoria] = useState('');
    const [newPrequirurgico, setNewPrequirurgico] = useState(false);
    const [isAddingTipo, setIsAddingTipo] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const loadTipos = useCallback(async () => {
        setIsLoadingTipos(true);
        try { setTipos(await getTiposEstudio()); }
        catch (e) { console.error(e); }
        finally { setIsLoadingTipos(false); }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setDatos({ ...DATOS_PACIENTE_VACIOS, ...datosIniciales });
            setFecha(new Date().toISOString().split('T')[0]);
            setDiagnostico('');
            setNotas('');
            setShowCatalog(false);
            setNewNombre('');
            setNewDescripcion('');
            setNewCategoria('');
            setNewPrequirurgico(false);
            loadTipos();
        }
    }, [isOpen, loadTipos, datosIniciales]);

    const handleDatoChange = (e) => {
        const { name, value } = e.target;
        setDatos((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddTipo = async () => {
        if (!newNombre.trim()) return;
        setIsAddingTipo(true);
        try {
            const created = await addTipoEstudio(newNombre, newDescripcion, newCategoria, newPrequirurgico);
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

    const handleUpdateTipo = async (tipo, cambios) => {
        const anterior = tipos;
        setTipos((prev) => prev.map((t) => (t.id === tipo.id ? { ...t, ...cambios } : t)));
        try {
            await updateTipoEstudio(tipo.id, cambios);
        } catch (e) {
            setTipos(anterior);
            Swal.fire('Error', 'No se pudo actualizar el estudio.', 'error');
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

    const handleSyncCatalogo = async () => {
        const { isConfirmed } = await Swal.fire({
            title: 'Aplicar categorías sugeridas',
            text: 'Se agrupan los estudios en perfiles (Metabólico, Hepático, Renal…) y se agregan los que falten. No se borra ni se renombra nada, y los estudios que ya tienen categoría no se tocan.',
            icon: 'question', showCancelButton: true, confirmButtonText: 'Aplicar', cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        setIsSyncing(true);
        try {
            const { creados, categorizados } = await aplicarCatalogoCategorizado();
            await loadTipos();
            Swal.fire('Listo', `Estudios categorizados: ${categorizados}. Estudios nuevos: ${creados}.`, 'success');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo aplicar el catálogo sugerido.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Un mismo estudio puede figurar en dos perfiles (ej. ecocardiograma): se envía una sola vez.
        const vistos = new Set();
        const selectedTipos = tipos
            .filter((t) => selectedIds.has(t.id))
            .filter((t) => { const key = normalizeNombre(t.nombre); if (vistos.has(key)) return false; vistos.add(key); return true; })
            .map((t) => ({ nombre: t.nombre, descripcion: t.descripcion || '' }));
        if (selectedTipos.length === 0) {
            Swal.fire('Atención', 'Seleccioná al menos un estudio.', 'warning');
            return;
        }
        setIsSubmitting(true);
        const datosPaciente = Object.fromEntries(Object.entries(datos).map(([key, value]) => [key, (value || '').trim()]));
        const estudioData = {
            tipos: selectedTipos,
            datosPaciente,
            solicitadoPor: `Dra. ${MEMBRETE.profesional}`,
            fecha,
            diagnostico,
            notas,
        };
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
                    <p className="estudio-membrete-note">
                        Membrete: <strong>Dra. {MEMBRETE.profesional}</strong> · {MEMBRETE.matricula}
                    </p>

                    <h4>Datos del paciente</h4>
                    <div className="estudio-datos-grid">
                        {CAMPOS_DATOS.map(({ name, label, required, type }) => (
                            <div className="form-group" key={name}>
                                <label htmlFor={`estudio-${name}`}>{label}:</label>
                                <input id={`estudio-${name}`} name={name} type={type || 'text'} value={datos[name]} onChange={handleDatoChange} required={required} />
                            </div>
                        ))}
                        <div className="form-group">
                            <label htmlFor="fechaEstudio">Fecha:</label>
                            <input id="fechaEstudio" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                        </div>
                    </div>

                    <div className="estudios-catalog-header">
                        <h4>Estudios a solicitar {selectedIds.size > 0 && <span className="estudios-selected-badge">{selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}</span>}</h4>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCatalog((s) => !s)}>
                            {showCatalog ? 'Ocultar catálogo' : 'Gestionar catálogo'}
                        </button>
                    </div>

                    {showCatalog && (
                        <div className="estudios-catalog-manager">
                            <div className="estudios-catalog-add">
                                <input type="text" placeholder="Nombre del estudio" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} />
                                <input type="text" placeholder="Descripción (opcional)" value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} />
                                <select value={newCategoria} onChange={(e) => setNewCategoria(e.target.value)} aria-label="Categoría del nuevo estudio">
                                    <option value="">Otros</option>
                                    {CATEGORIAS.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                                </select>
                                <label className="estudio-tipo-preqx"><input type="checkbox" checked={newPrequirurgico} onChange={(e) => setNewPrequirurgico(e.target.checked)} /> Pre-qx</label>
                                <button type="button" className="add-line-btn" onClick={handleAddTipo} disabled={isAddingTipo || !newNombre.trim()}>
                                    <FaPlus /> {isAddingTipo ? 'Agregando...' : 'Agregar'}
                                </button>
                            </div>
                            <div className="estudios-catalog-sync">
                                <button type="button" className="link-btn" onClick={handleSyncCatalogo} disabled={isSyncing}>
                                    <FaSync /> {isSyncing ? 'Aplicando...' : 'Aplicar categorías sugeridas'}
                                </button>
                                <span>Agrupa el catálogo en perfiles y agrega los estudios que falten.</span>
                            </div>
                        </div>
                    )}

                    {isLoadingTipos ? (
                        <p>Cargando catálogo...</p>
                    ) : (
                        <EstudiosCatalogoPicker tipos={tipos} selectedIds={selectedIds} onSelectionChange={setSelectedIds}
                            managing={showCatalog} onDeleteTipo={handleDeleteTipo} onUpdateTipo={handleUpdateTipo} />
                    )}

                    <div className="form-group">
                        <label htmlFor="diagnosticoEstudio">Diagnóstico</label>
                        <textarea id="diagnosticoEstudio" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
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
