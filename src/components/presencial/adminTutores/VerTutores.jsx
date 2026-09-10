// VerTutores.jsx
import React, { useState, useCallback, useMemo, useDeferredValue } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Swal from "sweetalert2";
import { FaPlus, FaDog, FaStethoscope, FaFileExcel } from "react-icons/fa";
import { FaUserLarge } from "react-icons/fa6";
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline } from "react-icons/md";
import { PiBathtub } from "react-icons/pi";
import ReporteDeudoresModal from "./ReporteDeudoresModal";
import { useLiveCollection } from "../../../services/liveCollectionStore";
import { normalizeText, onlyDigits, isNumericTerm, esCollator } from "../../utils/searchUtils";

const ITEMS_PER_PAGE = 12;

// Los tutores importados guardan `pacientesIds`; los creados desde el dashboard, `pacienteIds`.
const countPacientes = (tutor) =>
  new Set([...(tutor.pacienteIds || []), ...(tutor.pacientesIds || [])]).size;

const SORTERS = {
  name_asc: (a, b) => esCollator.compare(a.name, b.name),
  name_desc: (a, b) => esCollator.compare(b.name, a.name),
  newest: (a, b) => b.createdMs - a.createdMs,
  debt_asc: (a, b) => a.balance - b.balance,
  debt_desc: (a, b) => b.balance - a.balance,
};

const matchesService = (services, serviceType) => {
  if (serviceType === "clinical") return services.includes("clinical");
  if (serviceType === "grooming") return services.includes("grooming");
  if (serviceType === "both") return services.includes("clinical") && services.includes("grooming");
  return true;
};

const VerTutores = () => {
  const { docs: tutores, isLoading, isSyncing, error } = useLiveCollection("tutores");
  const [showReporteModal, setShowReporteModal] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortOrder: "name_asc",
    serviceType: "todos",
    showOnlyDebtors: false,
  });
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { sortOrder, serviceType, showOnlyDebtors } = filters;
  // El input se actualiza al instante; el filtrado corre con el valor diferido.
  const deferredSearchTerm = useDeferredValue(filters.searchTerm);

  // 1) Índice de búsqueda: se arma una vez por cambio de datos, no en cada tecla.
  const indexed = useMemo(
    () =>
      tutores.map((tutor) => ({
        tutor,
        name: tutor.name || "",
        search: normalizeText(`${tutor.name || ""} ${tutor.email || ""} ${tutor.dni || ""} ${tutor.phone || ""}`),
        digits: `${onlyDigits(tutor.phone)} ${onlyDigits(tutor.dni)}`,
        balance: tutor.accountBalance || 0,
        createdMs: tutor.createdAt?.toMillis?.() || 0,
        services: tutor.serviceTypes || [],
        pacientesCount: countPacientes(tutor),
      })),
    [tutores]
  );

  // 2) Orden: solo cuando cambian los datos o el criterio.
  const sorted = useMemo(
    () => [...indexed].sort(SORTERS[sortOrder] || (() => 0)),
    [indexed, sortOrder]
  );

  // 3) Filtros: una pasada lineal sobre la lista ya ordenada.
  const filteredTutores = useMemo(() => {
    const term = normalizeText(deferredSearchTerm.trim());
    const termDigits = isNumericTerm(term) ? onlyDigits(term) : "";

    if (!term && serviceType === "todos" && !showOnlyDebtors) return sorted;

    return sorted.filter(
      (entry) =>
        matchesService(entry.services, serviceType) &&
        (!showOnlyDebtors || entry.balance < 0) &&
        (!term || entry.search.includes(term) || (termDigits && entry.digits.includes(termDigits)))
    );
  }, [sorted, deferredSearchTerm, serviceType, showOnlyDebtors]);

  const totalPages = Math.ceil(filteredTutores.length / ITEMS_PER_PAGE);
  // Si una baja deja la página actual vacía, se muestra la última disponible.
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const currentItems = filteredTutores.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // El listener de Firestore actualiza la lista solo; no hace falta recargar.
  const handleDelete = useCallback(async (tutorId, tutorName) => {
    const result = await Swal.fire({
      title: `¿Eliminar a ${tutorName}?`,
      text: "Esta acción no se puede deshacer. Los pacientes asociados NO serán eliminados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tutores", tutorId));
        Swal.fire("Eliminado", `${tutorName} ha sido eliminado.`, "success");
      } catch (error) {
        console.error("Error deleting tutor:", error);
        Swal.fire("Error", `No se pudo eliminar a ${tutorName}.`, "error");
      }
    }
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setFilters((prev) => ({ ...prev, [name]: newValue }));
    setCurrentPage(1);
  }, []);

  const handleCardClick = useCallback((tutorId) => {
    navigate(`/admin/tutor-profile/${tutorId}`);
  }, [navigate]);

  return (
    <div className="tutor-list">
      {showReporteModal && (
        <ReporteDeudoresModal onClose={() => setShowReporteModal(false)} />
      )}

      <div className="tutor-list__header">
        <h1>
          Gestión de Tutores
          {isSyncing && !isLoading && (
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6c757d', marginLeft: '10px' }}>Actualizando…</span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="tutor-list__btn"
            style={{ backgroundColor: '#1d6f42', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setShowReporteModal(true)}
          >
            <FaFileExcel /> Reporte Deudores
          </button>
          <Link to="/admin/add-tutor" className="tutor-list__btn tutor-list__btn--primary">
            <FaPlus /> Agregar Tutor
          </Link>
        </div>
      </div>

      <div className="tutor-list__filters">
        <div className="tutor-list__filter-group">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, email o teléfono..."
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>
        <div className="tutor-list__filter-group">
          <select
            name="sortOrder"
            value={filters.sortOrder}
            onChange={handleFilterChange}
          >
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="debt_desc">Deuda (Menor a Mayor)</option>
            <option value="debt_asc">Deuda (Mayor a Menor)</option>
            <option value="newest">Más nuevos</option>
          </select>
        </div>
        <div className="tutor-list__filter-group">
          <label htmlFor="serviceType">Filtrar por Servicio</label>
          <select
            id="serviceType"
            name="serviceType"
            value={filters.serviceType}
            onChange={handleFilterChange}
          >
            <option value="todos">Todos</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="tutor-list__filter-group tutor-list__filter-group--checkbox">
          <input
            type="checkbox"
            id="showOnlyDebtors"
            name="showOnlyDebtors"
            checked={filters.showOnlyDebtors}
            onChange={handleFilterChange}
          />
          <label htmlFor="showOnlyDebtors">Ver Solo Deudores</label>
        </div>
      </div>

      {isLoading ? (
        <p className="tutor-list__message">Cargando...</p>
      ) : error && tutores.length === 0 ? (
        <p className="tutor-list__message">No se pudieron cargar los tutores.</p>
      ) : (
        <>
          <div className="tutor-list__grid">
            {currentItems.map((entry) => (
              <TutorCard
                key={entry.tutor.id}
                tutor={entry.tutor}
                pacientesCount={entry.pacientesCount}
                onCardClick={handleCardClick}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="tutor-list__pagination">
              <button
                className="tutor-list__btn"
                onClick={() => setCurrentPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                className="tutor-list__btn"
                onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Memoized card component to prevent unnecessary re-renders
const TutorCard = React.memo(({ tutor, pacientesCount, onCardClick, onDelete }) => {
  const handleClick = useCallback(() => {
    onCardClick(tutor.id);
  }, [tutor.id, onCardClick]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    onDelete(tutor.id, tutor.name);
  }, [tutor.id, tutor.name, onDelete]);

  return (
    <div className="tutor-list__card" onClick={handleClick}>
      <div className="tutor-list__card-header">
        <div className="tutor-list__avatar">
          <FaUserLarge />
        </div>
        <div className="tutor-list__info">
          <p className="tutor-list__name">
            <Link
              className="tutor-list__link"
              to={`/admin/tutor-profile/${tutor.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {tutor.name}
            </Link>
          </p>
          <p className="tutor-list__contact">
            {tutor.phone || tutor.email || "Sin contacto"}
          </p>
        </div>
      </div>

      <div className="tutor-list__card-body">
        <div className="tutor-list__chip">
          <FaDog />
          <span>{pacientesCount} Pacientes</span>
        </div>
        <div
          className={`tutor-list__chip tutor-list__chip--balance ${
            tutor.accountBalance < 0 ? "tutor-list__chip--deudor" : ""
          }`}
        >
          <span>${tutor.accountBalance?.toFixed?.(2) || "0.00"}</span>
        </div>
        {tutor.serviceTypes && tutor.serviceTypes.length > 0 && (
          <div className="tutor-list__service-chips">
            {tutor.serviceTypes.includes("clinical") && (
              <div className="tutor-list__service-chip tutor-list__service-chip--clinical">
                <FaStethoscope />
                <span>Clínica</span>
              </div>
            )}
            {tutor.serviceTypes.includes("grooming") && (
              <div className="tutor-list__service-chip tutor-list__service-chip--grooming">
                <PiBathtub />
                <span>Peluquería</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tutor-list__card-actions">
        <Link
          to={`/admin/edit-tutor/${tutor.id}`}
          className="tutor-list__btn tutor-list__btn--edit"
          onClick={(e) => e.stopPropagation()}
        >
          <CiEdit />
        </Link>
        <button
          onClick={handleDeleteClick}
          className="tutor-list__btn tutor-list__btn--delete"
        >
          <MdDeleteOutline />
        </button>
      </div>
    </div>
  );
});

TutorCard.displayName = 'TutorCard';

export default VerTutores;
