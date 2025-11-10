import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import Swal from "sweetalert2";
import { FaPlus, FaDog, FaStethoscope } from "react-icons/fa";
import { FaUserLarge } from "react-icons/fa6";
import { CiEdit } from "react-icons/ci";
import { MdDeleteOutline } from "react-icons/md";
import { PiBathtub } from "react-icons/pi";

// Cache for tutores data
let tutoresCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const VerTutores = () => {
  const [tutores, setTutores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortOrder: "name_asc",
    serviceType: "todos",
    showOnlyDebtors: false,
  });
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Check if cache is valid
  const isCacheValid = useCallback(() => {
    return tutoresCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);
  }, []);

  const fetchTutores = useCallback(async (forceRefresh = false) => {
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      setTutores(tutoresCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "tutores"));
      const tutorsList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Update cache
      tutoresCache = tutorsList;
      cacheTimestamp = Date.now();
      
      setTutores(tutorsList);
    } catch (error) {
      console.error("Error fetching tutores:", error);
      Swal.fire("Error", "No se pudieron cargar los tutores.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [isCacheValid]);

  useEffect(() => {
    fetchTutores();
  }, [fetchTutores]);

  // Memoized filtered and sorted tutores
  const filteredTutores = useMemo(() => {
    let filtered = [...tutores];

    // Service type filter
    if (filters.serviceType !== "todos") {
      filtered = filtered.filter((t) => {
        const services = t.serviceTypes || [];
        if (filters.serviceType === "clinical") return services.includes("clinical");
        if (filters.serviceType === "grooming") return services.includes("grooming");
        if (filters.serviceType === "both") return services.includes("clinical") && services.includes("grooming");
        return true;
      });
    }

    // Debtors filter
    if (filters.showOnlyDebtors) {
      filtered = filtered.filter((t) => (t.accountBalance || 0) < 0);
    }

    // Search filter
    const term = filters.searchTerm.toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (t) =>
          t.name?.toLowerCase().includes(term) ||
          t.email?.toLowerCase().includes(term) ||
          t.dni?.includes(term) ||
          t.phone?.includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const balanceA = a.accountBalance || 0;
      const balanceB = b.accountBalance || 0;

      switch (filters.sortOrder) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "newest":
          return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        case "debt_asc":
          return balanceA - balanceB;
        case "debt_desc":
          return balanceB - balanceA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [filters, tutores]);

  // Memoized current page items
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const items = filteredTutores.slice(indexOfFirstItem, indexOfLastItem);
    const pages = Math.ceil(filteredTutores.length / itemsPerPage);
    
    return { currentItems: items, totalPages: pages };
  }, [filteredTutores, currentPage, itemsPerPage]);

  const handleDelete = async (tutorId, tutorName) => {
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
        
        // Invalidate cache and refresh
        tutoresCache = null;
        cacheTimestamp = null;
        
        Swal.fire("Eliminado", `${tutorName} ha sido eliminado.`, "success");
        fetchTutores(true);
      } catch (error) {
        console.error("Error deleting tutor:", error);
        Swal.fire("Error", `No se pudo eliminar a ${tutorName}.`, "error");
      }
    }
  };

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
      <div className="tutor-list__header">
        <h1>Gestión de Tutores</h1>
        <Link to="/admin/add-tutor" className="tutor-list__btn tutor-list__btn--primary">
          <FaPlus /> Agregar Tutor
        </Link>
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
      ) : (
        <>
          <div className="tutor-list__grid">
            {currentItems.map((tutor) => (
              <TutorCard
                key={tutor.id}
                tutor={tutor}
                onCardClick={handleCardClick}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="tutor-list__pagination">
              <button
                className="tutor-list__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="tutor-list__btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
const TutorCard = React.memo(({ tutor, onCardClick, onDelete }) => {
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
          <span>{tutor.pacientesIds?.length || 0} Pacientes</span>
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