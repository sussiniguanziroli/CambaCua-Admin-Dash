const formatCreationDate = (recipe) => {
    if (recipe.creationDate) {
        const [y, m, d] = recipe.creationDate.split('-');
        if (d) return `${d}/${m}/${y}`;
    }
    return recipe.createdAt?.toDate ? recipe.createdAt.toDate().toLocaleDateString('es-AR') : 'N/A';
};

// onEdit: si se pasa, muestra el botón "Editar" (se omite, por ejemplo, con pacientes fallecidos).
const ViewRecipeModal = ({ isOpen, onClose, onPrint, onEdit, recipe, paciente }) => {
    if (!isOpen || !recipe) return null;

    return (
        <div className="agenda-modal-overlay">
            <div className="agenda-modal-content view-note-modal recipe-view-modal">
                <div className="modal-header">
                    <h3>Receta Clínica</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div id="recipe-to-print" className="view-note-body">
                    <div className="recipe-header-print">
                        <h1>CambaCuaVet</h1>
                        <p>Receta Clínica</p>
                    </div>
                    <div className="info-section">
                        <small>Fecha</small>
                        <p>{formatCreationDate(recipe)}</p>
                    </div>
                    <div className="info-section">
                        <small>Paciente</small>
                        <p>{paciente.name} ({paciente.species})</p>
                    </div>
                     <div className="info-section">
                        <small>Tutor</small>
                        <p>{paciente.tutorName}</p>
                    </div>
                    <div className="info-section">
                        <small>Recetado por</small>
                        <p>{recipe.prescribedBy}</p>
                    </div>
                    {recipe.generalIndications && (
                        <div className="info-section">
                            <small>Indicaciones Generales</small>
                            <p>{recipe.generalIndications}</p>
                        </div>
                    )}
                    <div className="info-section">
                        <small>Prescripciones</small>
                        <table className="prescription-table">
                            <thead>
                                <tr>
                                    <th>Producto/Medicación</th>
                                    <th>Dosis</th>
                                    <th>Frecuencia</th>
                                    <th>Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(recipe.prescriptions || []).map((p, index) => (
                                    <tr key={index}>
                                        <td>{p.productName}</td>
                                        <td>{p.dose}</td>
                                        <td>{p.frequency}</td>
                                        <td>{p.duration}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {recipe.updatedAt?.toDate && (
                    <p className="recipe-edited-note">Editada el {recipe.updatedAt.toDate().toLocaleDateString('es-AR')}</p>
                )}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
                    {onEdit && <button type="button" className="btn btn-secondary" onClick={onEdit}>Editar</button>}
                    <button type="button" className="btn btn-primary" onClick={() => onPrint('recipe-to-print')}>Imprimir / Exportar PDF</button>
                </div>
            </div>
        </div>
    );
};

export default ViewRecipeModal;
