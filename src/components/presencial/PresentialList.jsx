import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrash,
  FaBox,
  FaHandHoldingMedical,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// --- New Reusable Pagination Component ---
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="pagination__button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página Anterior"
      >
        <FaChevronLeft />
        Anterior
      </button>
      <span className="pagination__status">
        Página {currentPage} de {totalPages}
      </span>
      <button
        className="pagination__button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Página Siguiente"
      >
        Siguiente
        <FaChevronRight />
      </button>
    </div>
  );
};

// --- Refactored PresentialList Component ---
const ITEMS_PER_PAGE = 7;

const PresentialList = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productCategories, setProductCategories] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [subcategoriesForFilter, setSubcategoriesForFilter] = useState([]);

  const [filters, setFilters] = useState({
    text: "",
    tipo: "todos",
    category: "todas",
    subcategory: "todas",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentViewItems, setCurrentViewItems] = useState([]);

  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [priceModifier, setPriceModifier] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fetchItemsAndCategories = useCallback(async () => {
    // ... (Data fetching logic is unchanged) ...
    setIsLoading(true);
    setError(null);
    try {
      const itemsSnapshot = await getDocs(
        collection(db, "productos_presenciales")
      );
      const itemsData = itemsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const prodCatsSnap = await getDocs(collection(db, "categories"));
      const prodCats = prodCatsSnap.docs.map((docSnap) => ({
        ...docSnap.data(),
      }));

      const servCatsSnap = await getDocs(collection(db, "services_categories"));
      const servCats = servCatsSnap.docs.map((docSnap) => ({
        ...docSnap.data(),
      }));

      setItems(itemsData);
      setProductCategories(prodCats);
      setServiceCategories(servCats);
    } catch (err) {
      setError("No se pudieron cargar los datos.");
      Swal.fire({
        icon: "error",
        title: "Error de Carga",
        text: "No se pudieron cargar los items o categorías.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItemsAndCategories();
  }, [fetchItemsAndCategories]);

  // --- All other logic (filtering, pagination math, handlers) is unchanged ---
  // ... (useEffect for filtering) ...
  // ... (useEffect for pagination logic) ...
  // ... (handleFilterChange, clearFilters, handlePageChange) ...
  // ... (handleItemSelect, handleSelectAllVisible) ...
  // ... (parseModifier, handleApplyBulkPriceUpdate, handleBulkDelete, deleteItem) ...
  // ... (resolveCategoryName) ...

  useEffect(() => {
    let tempItems = [...items];
    if (filters.text) {
      const lowerText = filters.text.toLowerCase();
      tempItems = tempItems.filter(
        (item) =>
          (item.name && item.name.toLowerCase().includes(lowerText)) ||
          (item.description &&
            item.description.toLowerCase().includes(lowerText))
      );
    }
    if (filters.tipo !== "todos") {
      tempItems = tempItems.filter((item) => item.tipo === filters.tipo);
    }
    if (filters.category !== "todas") {
      tempItems = tempItems.filter(
        (item) => item.category === filters.category
      );
    }
    if (filters.subcategory !== "todas") {
      tempItems = tempItems.filter(
        (item) => item.subcat === filters.subcategory
      );
    }
    setFilteredItems(tempItems);
    setCurrentPage(1);
  }, [filters, items]);

  useEffect(() => {
    const newTotalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    setTotalPages(newTotalPages);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    } else if (newTotalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setCurrentViewItems(filteredItems.slice(startIndex, endIndex));
  }, [filteredItems, currentPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const newFilters = { ...prev, [name]: value };
      if (name === "tipo") {
        newFilters.category = "todas";
        newFilters.subcategory = "todas";
        setSubcategoriesForFilter([]);
      }
      if (name === "category") {
        newFilters.subcategory = "todas";
        const categories =
          newFilters.tipo === "producto"
            ? productCategories
            : serviceCategories;
        const selectedCat = categories.find((c) => c.adress === value);
        setSubcategoriesForFilter(selectedCat?.subcategorias || []);
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      text: "",
      tipo: "todos",
      category: "todas",
      subcategory: "todas",
    });
    setSubcategoriesForFilter([]);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemSelect = (itemId) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisibleIds = new Set(currentViewItems.map((p) => p.id));
    const allVisibleSelected = currentViewItems.every((p) =>
      selectedItemIds.has(p.id)
    );
    if (allVisibleSelected && currentViewItems.length > 0) {
      setSelectedItemIds((prev) => {
        const newSet = new Set(prev);
        allVisibleIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedItemIds((prev) => new Set([...prev, ...allVisibleIds]));
    }
  };

  const parseModifier = (value, modifier) => {
    modifier = String(modifier).replace(",", ".").trim();
    const numValue = parseFloat(value);
    if (isNaN(numValue)) throw new Error("Valor base inválido.");
    if (modifier.startsWith("*")) {
      const factor = parseFloat(modifier.substring(1));
      if (isNaN(factor)) throw new Error("Factor inválido.");
      return numValue * factor;
    } else if (modifier.startsWith("+")) {
      const addition = parseFloat(modifier.substring(1));
      if (isNaN(addition)) throw new Error("Suma inválida.");
      return numValue + addition;
    } else if (modifier.startsWith("-")) {
      const subtraction = parseFloat(modifier.substring(1));
      if (isNaN(subtraction)) throw new Error("Resta inválida.");
      return numValue - subtraction;
    } else if (modifier.startsWith("=")) {
      const directValue = parseFloat(modifier.substring(1));
      if (isNaN(directValue)) throw new Error("Valor directo inválido.");
      return directValue;
    } else if (modifier === "") {
      return numValue;
    }
    throw new Error("Modificador no reconocido.");
  };

  const handleApplyBulkPriceUpdate = async () => {
    if (selectedItemIds.size === 0 || !priceModifier) {
      Swal.fire(
        "Faltan Datos",
        "Selecciona items e ingresa un modificador.",
        "info"
      );
      return;
    }
    const result = await Swal.fire({
      title: `¿Actualizar ${selectedItemIds.size} items?`,
      html: `Modificador de precio: <b>${priceModifier}</b>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, actualizar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setIsBulkUpdating(true);
    const batch = writeBatch(db);
    let errorOccurred = false;
    for (const itemId of selectedItemIds) {
      const item = items.find((p) => p.id === itemId);
      if (!item) continue;
      try {
        const newPrice = parseModifier(item.price, priceModifier);
        if (isNaN(newPrice))
          throw new Error(`Cálculo inválido para ${item.name}`);
        batch.update(doc(db, "productos_presenciales", itemId), {
          price: Math.max(0, parseFloat(newPrice.toFixed(2))),
        });
      } catch (error) {
        errorOccurred = true;
        Swal.fire("Error en Modificador", error.message, "error");
        break;
      }
    }

    if (errorOccurred) {
      setIsBulkUpdating(false);
      return;
    }

    try {
      await batch.commit();
      Swal.fire(
        "Actualizado",
        `${selectedItemIds.size} items actualizados.`,
        "success"
      );
      setSelectedItemIds(new Set());
      setPriceModifier("");
      await fetchItemsAndCategories();
    } catch (error) {
      Swal.fire(
        "Error de Actualización",
        "No se pudieron actualizar los items.",
        "error"
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) {
      Swal.fire(
        "Nada Seleccionado",
        "Por favor, selecciona al menos un item.",
        "info"
      );
      return;
    }
    const result = await Swal.fire({
      title: `¿Eliminar ${selectedItemIds.size} items?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#E57373",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    setIsBulkUpdating(true);
    const batch = writeBatch(db);
    selectedItemIds.forEach((itemId) => {
      batch.delete(doc(db, "productos_presenciales", itemId));
    });

    try {
      await batch.commit();
      Swal.fire(
        "Eliminados",
        `${selectedItemIds.size} items han sido eliminados.`,
        "success"
      );
      setSelectedItemIds(new Set());
      await fetchItemsAndCategories();
    } catch (error) {
      Swal.fire("Error", "Ocurrió un problema al eliminar los items.", "error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const deleteItem = async (itemToDelete) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${itemToDelete.name}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#E57373",
      cancelButtonColor: "#95a5a6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "productos_presenciales", itemToDelete.id));
        Swal.fire({
          title: "Eliminado",
          text: `"${itemToDelete.name}" ha sido eliminado.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchItemsAndCategories();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `No se pudo eliminar "${itemToDelete.name}".`,
        });
      }
    }
  };

  const resolveCategoryName = (item) => {
    const categories =
      item.tipo === "producto" ? productCategories : serviceCategories;
    const cat = categories.find((c) => c.adress === item.category);
    return cat ? cat.nombre : item.category;
  };

  // --- JSX with NEW class names ---
  return (
    <div className="item-list">
      <div className="item-list__header">
        <h1>Items de Venta Presencial</h1>
        <Link to="/admin/add-presential" className="item-list__btn item-list__btn--primary">
          <FaPlus /> Agregar Nuevo Item
        </Link>
      </div>

      <div className="item-list__filters">
        <div className="item-list__filter-group">
          <label htmlFor="text-filter">Buscar</label>
          <input
            type="text"
            id="text-filter"
            name="text"
            value={filters.text}
            onChange={handleFilterChange}
            placeholder="Nombre o descripción..."
          />
        </div>
        <div className="item-list__filter-group">
          <label htmlFor="tipo-filter">Tipo</label>
          <select
            id="tipo-filter"
            name="tipo"
            value={filters.tipo}
            onChange={handleFilterChange}
          >
            <option value="todos">Todos</option>
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>
        </div>
        <div className="item-list__filter-group">
          <label htmlFor="category-filter">Categoría</label>
          <select
            id="category-filter"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            disabled={filters.tipo === "todos"}
          >
            <option value="todas">Todas</option>
            {(filters.tipo === "servicio"
              ? serviceCategories
              : productCategories
            ).map((cat) => (
              <option key={cat.adress} value={cat.adress}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
        {subcategoriesForFilter.length > 0 && (
          <div className="item-list__filter-group">
            <label htmlFor="subcategory-filter">Subcategoría</label>
            <select
              id="subcategory-filter"
              name="subcategory"
              value={filters.subcategory}
              onChange={handleFilterChange}
            >
              <option value="todas">Todas</option>
              {subcategoriesForFilter.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
        <button className="item-list__btn item-list__btn--secondary" onClick={clearFilters}>
          <FaTimes /> Limpiar
        </button>
      </div>

      {selectedItemIds.size > 0 && (
        <div className="item-list__bulk-actions">
          <h4>Acciones Masivas ({selectedItemIds.size} seleccionados)</h4>
          <div className="item-list__bulk-controls">
            <div className="item-list__form-group">
              <label htmlFor="priceModifier">Modificar Precio:</label>
              <input
                type="text"
                id="priceModifier"
                value={priceModifier}
                onChange={(e) => setPriceModifier(e.target.value)}
                placeholder="Ej: *1.1, +5, =50"
              />
            </div>
            <button
              onClick={handleApplyBulkPriceUpdate}
              disabled={isBulkUpdating}
              className="item-list__btn item-list__btn--success"
            >
              Aplicar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkUpdating}
              className="item-list__btn item-list__btn--danger"
            >
              Eliminar
            </button>
            <button
              onClick={() => setSelectedItemIds(new Set())}
              className="item-list__btn item-list__btn--secondary"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="item-list__controls">
          <div className="item-list__item-count">{filteredItems.length} item(s)</div>
          <button onClick={handleSelectAllVisible} className="item-list__btn item-list__btn--primary">
            {currentViewItems.every((p) => selectedItemIds.has(p.id)) &&
            currentViewItems.length > 0
              ? "Deseleccionar Visibles"
              : "Seleccionar Visibles"}
          </button>
        </div>
      )}

      {isLoading && <p className="item-list__message">Cargando items...</p>}
      {error && <p className="item-list__message item-list__message--error">{error}</p>}
      
      {!isLoading && !error && (
        <>
          <div className="item-list__list">
            {currentViewItems.length > 0 ? (
              currentViewItems.map((item) => (
                <div
                  key={item.id}
                  className={`item-card ${
                    selectedItemIds.has(item.id) ? "item-card--selected" : ""
                  }`}
                >
                  <div className="item-card__header">
                    <div
                      className="item-card__selector"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                      />
                    </div>
                    <span className={`item-card__badge item-card__badge--${item.tipo}`}>
                      {item.tipo === "producto" ? (
                        <FaBox />
                      ) : (
                        <FaHandHoldingMedical />
                      )}{" "}
                      {item.tipo}
                    </span>
                    <h3 className="item-card__title">{item.name}</h3>
                  </div>
                  
                  <p className="item-card__description">{item.description}</p>
                  
                  <div className="item-card__footer">
                    <div className="item-card__info">
                      <span className="item-card__price">
                        $
                        {item.price
                          ? item.price.toLocaleString("es-AR")
                          : "N/A"}
                      </span>
                      <span className="item-card__category">
                        {resolveCategoryName(item)}{" "}
                        {item.subcat && `> ${item.subcat}`}
                      </span>
                    </div>
                    <div className="item-card__actions">
                      <Link
                        to={`/admin/edit-presential/${item.id}`}
                        className="item-list__btn item-list__btn--edit"
                      >
                        <FaEdit />
                      </Link>
                      <button
                        onClick={() => deleteItem(item)}
                        className="item-list__btn item-list__btn--delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="item-list__message">No se encontraron items.</p>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

export default PresentialList;