import React, { useState, useCallback, useMemo, useDeferredValue } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc, updateDoc, arrayRemove, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Swal from "sweetalert2";
import { FaCat, FaDog, FaPlus } from "react-icons/fa";
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline, MdMiscellaneousServices } from "react-icons/md";
import { useLiveCollection } from "../../../services/liveCollectionStore";
import { normalizeText, esCollator } from "../../utils/searchUtils";

const ITEMS_PER_PAGE = 12;

const SORTERS = {
  name_asc: (a, b) => esCollator.compare(a.name, b.name),
  name_desc: (a, b) => esCollator.compare(b.name, a.name),
  tutor_asc: (a, b) => esCollator.compare(a.tutorName, b.tutorName),
};

const SERVICE_TYPES_BY_VALUE = {
  clinical: ["clinical"],
  grooming: ["grooming"],
  both: ["clinical", "grooming"],
};

const matchesService = (services, serviceType) => {
  if (serviceType === "clinical") return services.includes("clinical");
  if (serviceType === "grooming") return services.includes("grooming");
  if (serviceType === "both") return services.includes("clinical") && services.includes("grooming");
  return true;
};

const getServiceValue = (types = []) => {
  const hasC = types.includes("clinical");
  const hasG = types.includes("grooming");
  if (hasC && hasG) return "both";
  if (hasC) return "clinical";
  if (hasG) return "grooming";
  return "none";
};

const recalculateTutorServiceTypes = async (tutorId) => {
  if (!tutorId) return;
  try {
    const q = query(collection(db, "pacientes"), where("tutorId", "==", tutorId));
    const pacSnap = await getDocs(q);
    const all = new Set();
    pacSnap.docs.forEach(docu => (docu.data().serviceTypes || []).forEach(t => all.add(t)));
    const tutorRef = doc(db, "tutores", tutorId);
    await updateDoc(tutorRef, { serviceTypes: Array.from(all) });
  } catch (e) {
    console.error("Error recalculating tutor service types:", e);
  }
};

const VerPacientes = () => {
  const { docs: pacientes, isLoading, isSyncing, error } = useLiveCollection("pacientes");
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortOrder: "name_asc",
    showFallecidos: false,
    serviceType: "todos"
  });
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { sortOrder, showFallecidos, serviceType } = filters;
  // El input se actualiza al instante; el filtrado corre con el valor diferido.
  const deferredSearchTerm = useDeferredValue(filters.searchTerm);

  // 1) Índice de búsqueda: se arma una vez por cambio de datos, no en cada tecla.
  const indexed = useMemo(
    () =>
      pacientes.map((paciente) => ({
        paciente,
        name: paciente.name || "",
        tutorName: paciente.tutorName || "",
        search: normalizeText(`${paciente.name || ""} ${paciente.species || ""} ${paciente.tutorName || ""} ${paciente.chipNumber || ""}`),
        services: paciente.serviceTypes || [],
      })),
    [pacientes]
  );

  // 2) Orden: solo cuando cambian los datos o el criterio.
  const sorted = useMemo(
    () => [...indexed].sort(SORTERS[sortOrder] || (() => 0)),
    [indexed, sortOrder]
  );

  // 3) Filtros: una pasada lineal sobre la lista ya ordenada.
  const filteredPacientes = useMemo(() => {
    const term = normalizeText(deferredSearchTerm.trim());

    return sorted.filter(
      (entry) =>
        (showFallecidos || !entry.paciente.fallecido) &&
        matchesService(entry.services, serviceType) &&
        (!term || entry.search.includes(term))
    );
  }, [sorted, deferredSearchTerm, showFallecidos, serviceType]);

  const totalPages = Math.ceil(filteredPacientes.length / ITEMS_PER_PAGE);
  // Si una baja deja la página actual vacía, se muestra la última disponible.
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const currentItems = filteredPacientes.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // El listener de Firestore refleja el cambio en la lista al instante (sin recargar).
  const handleServiceChange = useCallback(async (paciente, value) => {
    const newTypes = SERVICE_TYPES_BY_VALUE[value] || [];
    try {
      await updateDoc(doc(db, "pacientes", paciente.id), { serviceTypes: newTypes });
      await recalculateTutorServiceTypes(paciente.tutorId);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Servicio actualizado",
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error) {
      console.error("Error updating service:", error);
      Swal.fire("Error", `No se pudo actualizar el servicio de ${paciente.name}.`, "error");
    }
  }, []);

  const handleDelete = useCallback(async (paciente) => {
    const result = await Swal.fire({
      title: `¿Eliminar a ${paciente.name}?`,
      text: "Se eliminará el paciente y el vínculo con su tutor.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "pacientes", paciente.id));

        if (paciente.tutorId) {
          const tutorRef = doc(db, "tutores", paciente.tutorId);
          // Los tutores importados usan `pacientesIds`; los creados desde el dashboard, `pacienteIds`.
          await updateDoc(tutorRef, { pacienteIds: arrayRemove(paciente.id), pacientesIds: arrayRemove(paciente.id) });
          await recalculateTutorServiceTypes(paciente.tutorId);
        }

        Swal.fire("Eliminado", `${paciente.name} ha sido eliminado.`, "success");
      } catch (error) {
        console.error("Error deleting paciente:", error);
        Swal.fire("Error", `No se pudo eliminar a ${paciente.name}.`, "error");
      }
    }
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setCurrentPage(1);
  }, []);

  const handleCardClick = useCallback((pacienteId) => {
    navigate(`/admin/paciente-profile/${pacienteId}`);
  }, [navigate]);

  return (
    <div className="patient-list">
      <div className="patient-list__header">
        <h1>
          Gestión de Pacientes
          {isSyncing && !isLoading && (
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6c757d', marginLeft: '10px' }}>Actualizando…</span>
          )}
        </h1>
        <Link to="/admin/add-paciente" className="patient-list__btn patient-list__btn--primary">
          <FaPlus /> Agregar Paciente
        </Link>
      </div>

      <div className="patient-list__filters">
        <div className="patient-list__filter-group">
          <input
            type="text"
            placeholder="Buscar por nombre, tutor, especie o chip..."
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>
        <div className="patient-list__filter-group">
          <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="tutor_asc">Tutor (A-Z)</option>
          </select>
        </div>
        <div className="patient-list__filter-group">
          <label htmlFor="serviceType">Filtrar por Servicio</label>
          <select id="serviceType" name="serviceType" value={filters.serviceType} onChange={handleFilterChange}>
            <option value="todos">Todos</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="patient-list__filter-group patient-list__filter-group--checkbox">
          <input type="checkbox" id="showFallecidos" name="showFallecidos" checked={filters.showFallecidos} onChange={handleFilterChange} />
          <label htmlFor="showFallecidos">Mostrar fallecidos</label>
        </div>
      </div>

      {isLoading ? (
        <p className="patient-list__message">Cargando...</p>
      ) : error && pacientes.length === 0 ? (
        <p className="patient-list__message">No se pudieron cargar los pacientes.</p>
      ) : (
        <>
          <div className="patient-list__grid">
            {currentItems.map((entry) => (
              <PacienteCard
                key={entry.paciente.id}
                paciente={entry.paciente}
                onCardClick={handleCardClick}
                onServiceChange={handleServiceChange}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="patient-list__pagination">
              <button
                className="patient-list__btn"
                onClick={() => setCurrentPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                className="patient-list__btn"
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
const PacienteCard = React.memo(({ paciente, onCardClick, onServiceChange, onDelete }) => {
  const handleClick = useCallback(() => {
    onCardClick(paciente.id);
  }, [paciente.id, onCardClick]);

  const handleServiceChangeLocal = useCallback((e) => {
    e.stopPropagation();
    onServiceChange(paciente, e.target.value);
  }, [paciente, onServiceChange]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    onDelete(paciente);
  }, [paciente, onDelete]);

  return (
    <div
      className={`patient-list__card ${paciente.fallecido ? "patient-list__card--fallecido" : ""}`}
      onClick={handleClick}
    >
      <div className="patient-list__card-header">
        <div className="patient-list__avatar">
          {paciente.species?.toLowerCase().includes("canino") ? <FaDog /> : <FaCat />}
        </div>
        <div className="patient-list__info">
          <p className="patient-list__name">
            <Link
              className="patient-list__link"
              to={`/admin/paciente-profile/${paciente.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {paciente.name}
            </Link>
          </p>
          <p className="patient-list__breed">{paciente.breed || paciente.species}</p>
        </div>
        {paciente.fallecido && <span className="patient-list__fallecido-tag">Fallecido</span>}
      </div>

      <div className="patient-list__card-body">
        <p className="patient-list__tutor-link">
          Tutor:{" "}
          {paciente.tutorId ? (
            <Link
              className="patient-list__link"
              to={`/admin/tutor-profile/${paciente.tutorId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {paciente.tutorName || "Ver tutor"}
            </Link>
          ) : (
            paciente.tutorName || "Sin tutor"
          )}
        </p>
      </div>

      <div className="patient-list__card-actions">
        <div className="patient-list__service-selector" onClick={(e) => e.stopPropagation()}>
          <MdMiscellaneousServices />
          <select
            value={getServiceValue(paciente.serviceTypes || [])}
            onChange={handleServiceChangeLocal}
            className="patient-list__service-dropdown"
          >
            <option value="none">Ninguno</option>
            <option value="clinical">Clínica</option>
            <option value="grooming">Peluquería</option>
            <option value="both">Ambos</option>
          </select>
        </div>

        <Link
          to={`/admin/edit-paciente/${paciente.id}`}
          className="patient-list__btn patient-list__btn--edit"
          onClick={(e) => e.stopPropagation()}
        >
          <CiEdit />
        </Link>

        <button
          onClick={handleDeleteClick}
          className="patient-list__btn patient-list__btn--delete"
        >
          <MdDeleteOutline />
        </button>
      </div>
    </div>
  );
});

PacienteCard.displayName = 'PacienteCard';

export default VerPacientes;
