import { generateEstudioPDF } from '../../../services/estudioService';
import { getDatosPaciente, formatFechaEstudio } from '../../../services/pdf/estudioPdf';

const ViewEstudioModal = ({ isOpen, onClose, estudio, paciente }) => {
    if (!isOpen || !estudio) return null;

    const datos = getDatosPaciente(estudio, paciente);
    const especieRaza = [datos.especie, datos.raza].filter(Boolean).join(' - ');
    const sexoEdad = [datos.sexo, datos.edad].filter(Boolean).join(' · ');
    const tipos = estudio.tipos || [];

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content view-note-modal recipe-view-modal">
                <div className="modal-header">
                    <h3>Solicitud de Estudios</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="view-note-body">
                    <div className="info-grid">
                        <div className="info-section">
                            <small>Fecha</small>
                            <p>{formatFechaEstudio(estudio) || 'N/A'}</p>
                        </div>
                        <div className="info-section">
                            <small>Solicitado por</small>
                            <p>{estudio.solicitadoPor || 'N/A'}</p>
                        </div>
                        <div className="info-section">
                            <small>Paciente</small>
                            <p>{datos.pacienteNombre || 'N/A'}{especieRaza && ` (${especieRaza})`}</p>
                        </div>
                        <div className="info-section">
                            <small>Sexo / Edad</small>
                            <p>{sexoEdad || 'N/A'}</p>
                        </div>
                        <div className="info-section">
                            <small>Tutor</small>
                            <p>{datos.tutorNombre || 'N/A'}</p>
                        </div>
                        <div className="info-section">
                            <small>Teléfono</small>
                            <p>{datos.telefono || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="info-section">
                        <small>Estudios solicitados ({tipos.length})</small>
                        <table className="prescription-table">
                            <thead>
                                <tr>
                                    <th>Estudio</th>
                                    <th>Descripción / Indicación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tipos.map((t, i) => (
                                    <tr key={i}>
                                        <td>{t.nombre}</td>
                                        <td>{t.descripcion || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {estudio.diagnostico && (
                        <div className="info-section">
                            <small>Diagnóstico</small>
                            <p>{estudio.diagnostico}</p>
                        </div>
                    )}
                    {estudio.notas && (
                        <div className="info-section">
                            <small>Notas</small>
                            <p>{estudio.notas}</p>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    <button type="button" className="btn btn-primary" onClick={() => generateEstudioPDF(estudio, paciente)}>Imprimir PDF</button>
                </div>
            </div>
        </div>
    );
};

export default ViewEstudioModal;
