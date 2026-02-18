import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../../../firebase/config";
import {
    collectionGroup,
    query,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    deleteField,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { FaListUl, FaUserMd, FaBox, FaSyringe, FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";

const ITEMS_PER_PAGE = 20;

const fetchVencimientosPage = async (filters, lastVisibleDoc = null) => {
    let queryConstraints = [
        orderBy("dueDate", filters.sortOrder === "date-desc" ? "desc" : "asc"),
        limit(ITEMS_PER_PAGE),
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const sevenDaysTimestamp = Timestamp.fromDate(sevenDaysFromNow);

    switch (filters.status) {
        case "proximo":
            queryConstraints.push(where("supplied", "==", false));
            queryConstraints.push(where("dueDate", ">=", todayTimestamp));
            queryConstraints.push(where("dueDate", "<=", sevenDaysTimestamp));
            break;
        case "vencido":
            queryConstraints.push(where("supplied", "==", false));
            queryConstraints.push(where("dueDate", "<", todayTimestamp));
            break;
        case "pendiente":
            queryConstraints.push(where("supplied", "==", false));
            queryConstraints.push(where("dueDate", ">", sevenDaysTimestamp));
            break;
        case "suministrado":
            queryConstraints.push(where("supplied", "==", true));
            break;
        default:
            break;
    }

    if (filters.startDate) {
        queryConstraints.push(where("dueDate", ">=", new Date(filters.startDate)));
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        queryConstraints.push(where("dueDate", "<=", end));
    }

    if (lastVisibleDoc) {
        queryConstraints.push(startAfter(lastVisibleDoc));
    }

    const vencimientosQuery = query(
        collectionGroup(db, "vencimientos"),
        ...queryConstraints
    );
    const snapshot = await getDocs(vencimientosQuery);

    const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        pacienteId: d.ref.parent.parent.id,
        dueDate: d.data().dueDate.toDate(),
        suppliedDate: d.data().suppliedDate ? d.data().suppliedDate.toDate() : null,
    }));

    const newLastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = data.length === ITEMS_PER_PAGE;

    return { data, lastDoc: newLastVisibleDoc, hasMore };
};

const MonitorVencimientos = () => {
    const [vencimientos, setVencimientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [viewMode, setViewMode] = useState("vencimiento");
    const [filters, setFilters] = useState({
        searchTerm: "",
        status: "proximo",
        startDate: "",
        endDate: "",
        sortOrder: "date-asc",
    });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectMode, setSelectMode] = useState(false);

    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkFilters, setBulkFilters] = useState({
        productName: "todos",
        pacienteName: "todos",
        status: "todos",
        startDate: "",
        endDate: "",
    });

    const loadData = useCallback(async (currentFilters, lastDoc = null) => {
        if (lastDoc) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const { data, lastDoc: newLastDoc, hasMore: newHasMore } = await fetchVencimientosPage(currentFilters, lastDoc);
            setVencimientos((prev) => (lastDoc ? [...prev, ...data] : data));
            setLastVisibleDoc(newLastDoc);
            setHasMore(newHasMore);
        } catch (error) {
            console.error("Firestore query failed: ", error);
            Swal.fire("Error", "No se pudieron cargar los vencimientos. Verifique los índices de Firestore requeridos en la consola del navegador.", "error");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setVencimientos([]);
        setLastVisibleDoc(null);
        setHasMore(true);
        loadData(filters);
    }, [filters.status, filters.startDate, filters.endDate, filters.sortOrder, loadData]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleBulkFilterChange = (e) => {
        const { name, value } = e.target;
        setBulkFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleCycleViewMode = () => {
        setViewMode((current) => {
            if (current === "vencimiento") return "paciente";
            if (current === "paciente") return "producto";
            return "vencimiento";
        });
    };

    const handleLoadMore = () => {
        if (hasMore && !isLoadingMore) {
            loadData(filters, lastVisibleDoc);
        }
    };

    const toggleSupplied = async (vencimiento) => {
        const isCurrentlySupplied = vencimiento.supplied;
        const result = await Swal.fire({
            title: `¿${isCurrentlySupplied ? "Desmarcar" : "Marcar"} Suministrado?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, cambiar",
            cancelButtonText: "Cancelar",
        });
        if (!result.isConfirmed) return;

        try {
            const vencRef = doc(db, `pacientes/${vencimiento.pacienteId}/vencimientos`, vencimiento.id);
            await updateDoc(vencRef, {
                supplied: !isCurrentlySupplied,
                suppliedDate: !isCurrentlySupplied ? serverTimestamp() : deleteField(),
                status: !isCurrentlySupplied ? "suministrado" : "pendiente",
            });
            setVencimientos((prev) =>
                prev.map((v) =>
                    v.id === vencimiento.id
                        ? { ...v, supplied: !isCurrentlySupplied, status: !isCurrentlySupplied ? "suministrado" : "pendiente", suppliedDate: !isCurrentlySupplied ? new Date() : null }
                        : v
                )
            );
            Swal.fire("¡Éxito!", "El estado ha sido actualizado.", "success");
        } catch (error) {
            Swal.fire("Error", "No se pudo actualizar el estado.", "error");
        }
    };

    const handleDeleteVencimiento = async (v) => {
        const { isConfirmed } = await Swal.fire({
            title: "¿Eliminar Vencimiento?",
            html: `Se eliminará <strong>${v.productName}</strong> de <strong>${v.pacienteName}</strong> con vencimiento el ${v.dueDate.toLocaleDateString("es-AR")}. Esta acción no se puede deshacer.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!isConfirmed) return;

        try {
            await deleteDoc(doc(db, `pacientes/${v.pacienteId}/vencimientos`, v.id));
            setVencimientos((prev) => prev.filter((item) => item.id !== v.id));
            Swal.fire("Eliminado", "El vencimiento fue eliminado.", "success");
        } catch (error) {
            Swal.fire("Error", "No se pudo eliminar el vencimiento.", "error");
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    
    const handleSelectAll = () => {
        if (selectedIds.size === filteredData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredData.map(v => v.id)));
        }
    };

    const getStatus = (v) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (v.supplied) return "suministrado";
        if (v.dueDate < today) return "vencido";
        const daysDiff = Math.ceil((v.dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) return "proximo";
        return "pendiente";
    };

    const uniqueProductNames = useMemo(() => {
        return ["todos", ...new Set(vencimientos.map((v) => v.productName).filter(Boolean))].sort();
    }, [vencimientos]);

    const uniquePatientNames = useMemo(() => {
        return ["todos", ...new Set(vencimientos.map((v) => v.pacienteName).filter(Boolean))].sort();
    }, [vencimientos]);

    const bulkMatches = useMemo(() => {
        return vencimientos.filter((v) => {
            if (!v.productName || !v.dueDate) return false;
            if (bulkFilters.productName !== "todos" && v.productName !== bulkFilters.productName) return false;
            if (bulkFilters.pacienteName !== "todos" && v.pacienteName !== bulkFilters.pacienteName) return false;
            if (bulkFilters.status !== "todos" && getStatus(v) !== bulkFilters.status) return false;
            if (bulkFilters.startDate) {
                const start = new Date(bulkFilters.startDate);
                start.setHours(0, 0, 0, 0);
                if (v.dueDate < start) return false;
            }
            if (bulkFilters.endDate) {
                const end = new Date(bulkFilters.endDate);
                end.setHours(23, 59, 59, 999);
                if (v.dueDate > end) return false;
            }
            return true;
        });
    }, [vencimientos, bulkFilters]);

    const handleBulkDelete = async () => {
        if (bulkMatches.length === 0) {
            Swal.fire("Sin resultados", "No hay vencimientos que coincidan con los filtros seleccionados.", "info");
            return;
        }

        const { isConfirmed } = await Swal.fire({
            title: `¿Eliminar ${bulkMatches.length} vencimiento(s)?`,
            html: `Esta acción eliminará <strong>${bulkMatches.length}</strong> vencimiento(s) de forma permanente. No se puede deshacer.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sí, eliminar todos",
            cancelButtonText: "Cancelar",
        });

        if (!isConfirmed) return;

        try {
            const batch = writeBatch(db);
            bulkMatches.forEach((v) => {
                batch.delete(doc(db, `pacientes/${v.pacienteId}/vencimientos`, v.id));
            });
            await batch.commit();

            const deletedIds = new Set(bulkMatches.map((v) => v.id));
            setVencimientos((prev) => prev.filter((v) => !deletedIds.has(v.id)));
            setBulkFilters({ productName: "todos", pacienteName: "todos", status: "todos", startDate: "", endDate: "" });
            setBulkDeleteOpen(false);
            Swal.fire("¡Listo!", `${bulkMatches.length} vencimiento(s) eliminados.`, "success");
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "No se pudo completar la eliminación masiva.", "error");
        }
    };

    const { filteredData, groupedByPatient, groupedByProduct } = useMemo(() => {
        let filtered = [...vencimientos];
        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(
                (v) =>
                    v.productName?.toLowerCase().includes(lowerTerm) ||
                    v.pacienteName?.toLowerCase().includes(lowerTerm) ||
                    v.tutorName?.toLowerCase().includes(lowerTerm)
            );
        }

        const patientGroups = filtered.reduce((acc, v) => {
            (acc[v.pacienteId] = acc[v.pacienteId] || {
                info: { pacienteName: v.pacienteName, pacienteId: v.pacienteId, tutorName: v.tutorName, tutorId: v.tutorId },
                vencimientos: [],
            }).vencimientos.push(v);
            return acc;
        }, {});

        const productGroups = filtered.reduce((acc, v) => {
            (acc[v.productName] = acc[v.productName] || {
                info: { productName: v.productName, isDoseable: v.appliedDosage != null },
                vencimientos: [],
            }).vencimientos.push(v);
            return acc;
        }, {});

        return {
            filteredData: filtered,
            groupedByPatient: Object.values(patientGroups),
            groupedByProduct: Object.values(productGroups),
        };
    }, [vencimientos, filters.searchTerm]);

    const statusLabels = {
        proximo: { label: "Próximo", icon: "🔔" },
        vencido: { label: "Vencido", icon: "❗" },
        pendiente: { label: "Pendiente", icon: "🗓️" },
        suministrado: { label: "Suministrado", icon: "✅" },
    };

    const ViewModeIcon = () =>
        viewMode === "vencimiento" ? <FaListUl /> : viewMode === "paciente" ? <FaUserMd /> : <FaBox />;

        return (
            <div className="monitor-vencimientos-container">
                <header className="monitor-header">
                    <h1>Monitor de Vencimientos</h1>
                    <p>Administra todos los vencimientos de productos y servicios para todos los pacientes.</p>
                </header>
        
                <div className="monitor-filter-bar">
                    <input type="text" name="searchTerm" placeholder="Buscar en resultados cargados..." value={filters.searchTerm} onChange={handleFilterChange} />
                    <select name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="todos">Todos</option>
                        <option value="proximo">Próximos a Vencer</option>
                        <option value="vencido">Vencidos</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="suministrado">Suministrados</option>
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                        <option value="date-asc">Vence Próximamente</option>
                        <option value="date-desc">Vence Más Tarde</option>
                    </select>
                    <button className="view-mode-toggle" onClick={handleCycleViewMode} title="Cambiar Vista">
                        <ViewModeIcon />
                    </button>
                    <button
                        className={`btn-select-mode-toggle ${selectMode ? "active" : ""}`}
                        onClick={() => { setSelectMode(prev => !prev); setSelectedIds(new Set()); }}
                    >
                        {selectMode ? "Cancelar Selección" : "Seleccionar"}
                    </button>
                    <button
                        className={`btn-bulk-delete-toggle ${bulkDeleteOpen ? "active" : ""}`}
                        onClick={() => setBulkDeleteOpen((prev) => !prev)}
                    >
                        <FaTrash /> Eliminar en Masa {bulkDeleteOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                </div>
        
                {bulkDeleteOpen && (
                    <div className="bulk-delete-panel">
                        <h4>Eliminación Masiva — sobre resultados cargados</h4>
                        <div className="bulk-delete-filters">
                            <div className="bulk-filter-group">
                                <label>Producto</label>
                                <select name="productName" value={bulkFilters.productName} onChange={handleBulkFilterChange}>
                                    {uniqueProductNames.map((p) => (
                                        <option key={p} value={p}>{p === "todos" ? "Todos los productos" : p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bulk-filter-group">
                                <label>Paciente</label>
                                <select name="pacienteName" value={bulkFilters.pacienteName} onChange={handleBulkFilterChange}>
                                    {uniquePatientNames.map((p) => (
                                        <option key={p} value={p}>{p === "todos" ? "Todos los pacientes" : p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bulk-filter-group">
                                <label>Estado</label>
                                <select name="status" value={bulkFilters.status} onChange={handleBulkFilterChange}>
                                    <option value="todos">Todos los estados</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="proximo">Próximo</option>
                                    <option value="vencido">Vencido</option>
                                    <option value="suministrado">Suministrado</option>
                                </select>
                            </div>
                            <div className="bulk-filter-group">
                                <label>Vence desde</label>
                                <input type="date" name="startDate" value={bulkFilters.startDate} onChange={handleBulkFilterChange} />
                            </div>
                            <div className="bulk-filter-group">
                                <label>Vence hasta</label>
                                <input type="date" name="endDate" value={bulkFilters.endDate} onChange={handleBulkFilterChange} />
                            </div>
                        </div>
                        <div className="bulk-delete-footer">
                            <span className={`bulk-match-count ${bulkMatches.length > 0 ? "has-matches" : ""}`}>
                                {bulkMatches.length} vencimiento(s) coinciden con los filtros
                            </span>
                            <button className="btn-bulk-confirm" onClick={handleBulkDelete} disabled={bulkMatches.length === 0}>
                                <FaTrash /> Eliminar {bulkMatches.length > 0 ? `(${bulkMatches.length})` : ""}
                            </button>
                        </div>
                    </div>
                )}
        
                {selectMode && selectedIds.size > 0 && (
                    <div className="selection-action-bar">
                        <span>{selectedIds.size} seleccionado(s)</span>
                        <button className="btn-bulk-confirm" onClick={async () => {
                            const toDelete = filteredData.filter(v => selectedIds.has(v.id));
                            const { isConfirmed } = await Swal.fire({
                                title: `¿Eliminar ${toDelete.length} vencimiento(s)?`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#d33",
                                cancelButtonColor: "#3085d6",
                                confirmButtonText: "Sí, eliminar",
                                cancelButtonText: "Cancelar",
                            });
                            if (!isConfirmed) return;
                            try {
                                const batch = writeBatch(db);
                                toDelete.forEach(v => batch.delete(doc(db, `pacientes/${v.pacienteId}/vencimientos`, v.id)));
                                await batch.commit();
                                setVencimientos(prev => prev.filter(v => !selectedIds.has(v.id)));
                                setSelectedIds(new Set());
                                Swal.fire("¡Listo!", `${toDelete.length} vencimiento(s) eliminados.`, "success");
                            } catch (error) {
                                Swal.fire("Error", "No se pudo completar la eliminación.", "error");
                            }
                        }}>
                            <FaTrash /> Eliminar seleccionados ({selectedIds.size})
                        </button>
                    </div>
                )}
        
                <main className="monitor-content">
                    {isLoading ? (
                        <p>Cargando...</p>
                    ) : (
                        <>
                            {viewMode === "vencimiento" && (
                                <>
                                    {selectMode && filteredData.length > 0 && (
                                        <div className="select-all-bar">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === filteredData.length && filteredData.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                                Seleccionar todos ({filteredData.length})
                                            </label>
                                        </div>
                                    )}
                                    <div className="vencimientos-grid">
                                        {filteredData.length > 0 ? (
                                            filteredData.map((v) => {
                                                const statusKey = getStatus(v);
                                                const statusInfo = statusLabels[statusKey] || {};
                                                return (
                                                    <div
                                                        key={v.id}
                                                        className={`vencimiento-card ${statusKey} ${selectMode && selectedIds.has(v.id) ? "selected" : ""}`}
                                                        onClick={selectMode ? () => handleToggleSelect(v.id) : undefined}
                                                    >
                                                        <div className="card-header">
                                                            {selectMode && (
                                                                <input
                                                                    type="checkbox"
                                                                    className="card-checkbox"
                                                                    checked={selectedIds.has(v.id)}
                                                                    onChange={() => handleToggleSelect(v.id)}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            )}
                                                            <span className="product-name">{v.productName}</span>
                                                            <span className={`status-badge ${statusKey}`}>
                                                                {statusInfo.icon} {statusInfo.label}
                                                            </span>
                                                        </div>
                                                        <div className="card-body">
                                                            <div className="info-line">
                                                                <span>Paciente:</span>
                                                                <Link to={`/admin/paciente-profile/${v.pacienteId}`} onClick={e => e.stopPropagation()}>{v.pacienteName}</Link>
                                                            </div>
                                                            <div className="info-line">
                                                                <span>Tutor:</span>
                                                                <Link to={`/admin/tutor-profile/${v.tutorId}`} onClick={e => e.stopPropagation()}>{v.tutorName}</Link>
                                                            </div>
                                                            {v.appliedDosage && (
                                                                <div className="info-line dosage">
                                                                    <span>Dosis Anterior:</span>
                                                                    <strong>{v.appliedDosage}</strong>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="card-footer">
                                                            <div className="date-info">
                                                                <strong>Vence el: {v.dueDate.toLocaleDateString("es-AR")}</strong>
                                                                {v.suppliedDate && (
                                                                    <small>Suministrado: {v.suppliedDate.toLocaleDateString("es-AR")}</small>
                                                                )}
                                                            </div>
                                                            {!selectMode && (
                                                                <div className="card-footer-actions">
                                                                    <button className="action-btn" onClick={() => toggleSupplied(v)}>
                                                                        {v.supplied ? "Deshacer" : "Suministrado"}
                                                                    </button>
                                                                    <button className="delete-btn" title="Eliminar vencimiento" onClick={() => handleDeleteVencimiento(v)}>
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="no-results">No se encontraron vencimientos.</p>
                                        )}
                                    </div>
                                </>
                            )}
        
                            {viewMode === "paciente" && (
                                <div className="vencimientos-grid">
                                    {groupedByPatient.length > 0 ? (
                                        groupedByPatient.map((group) => (
                                            <div key={group.info.pacienteId} className="patient-group-card">
                                                <div className="card-header">
                                                    <FaUserMd className="group-icon" />
                                                    <div>
                                                        <h3>
                                                            <Link className="link-class" to={`/admin/paciente-profile/${group.info.pacienteId}`}>
                                                                {group.info.pacienteName}
                                                            </Link>
                                                        </h3>
                                                        <small>
                                                            Tutor: <Link to={`/admin/tutor-profile/${group.info.tutorId}`}>{group.info.tutorName}</Link>
                                                        </small>
                                                    </div>
                                                </div>
                                                <div className="vencimiento-sublist">
                                                    {group.vencimientos.map((v) => {
                                                        const statusKey = getStatus(v);
                                                        const statusInfo = statusLabels[statusKey] || {};
                                                        return (
                                                            <div key={v.id} className={`sublist-item ${selectMode && selectedIds.has(v.id) ? "selected" : ""}`} onClick={selectMode ? () => handleToggleSelect(v.id) : undefined}>
                                                                <div className="sublist-item-info">
                                                                    {selectMode && (
                                                                        <input
                                                                            type="checkbox"
                                                                            className="card-checkbox"
                                                                            checked={selectedIds.has(v.id)}
                                                                            onChange={() => handleToggleSelect(v.id)}
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    )}
                                                                    <span>{v.productName}</span>
                                                                    {v.appliedDosage && <small>{v.appliedDosage}</small>}
                                                                </div>
                                                                <div className="sublist-item-status">
                                                                    <span className={`status-badge ${statusKey}`}>{statusInfo.label}</span>
                                                                    <strong>{v.dueDate.toLocaleDateString("es-AR")}</strong>
                                                                    {!selectMode && (
                                                                        <button className="sublist-delete-btn" title="Eliminar" onClick={() => handleDeleteVencimiento(v)}>
                                                                            <FaTrash />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-results">No hay pacientes con vencimientos.</p>
                                    )}
                                </div>
                            )}
        
                            {viewMode === "producto" && (
                                <div className="vencimientos-grid">
                                    {groupedByProduct.length > 0 ? (
                                        groupedByProduct.map((group) => (
                                            <div key={group.info.productName} className="product-group-card">
                                                <div className="card-header">
                                                    {group.info.isDoseable ? <FaSyringe className="group-icon" /> : <FaBox className="group-icon" />}
                                                    <h3>{group.info.productName}</h3>
                                                </div>
                                                <div className="vencimiento-sublist">
                                                    {group.vencimientos.map((v) => {
                                                        const statusKey = getStatus(v);
                                                        const statusInfo = statusLabels[statusKey] || {};
                                                        return (
                                                            <div key={v.id} className={`sublist-item ${selectMode && selectedIds.has(v.id) ? "selected" : ""}`} onClick={selectMode ? () => handleToggleSelect(v.id) : undefined}>
                                                                <div className="sublist-item-info">
                                                                    {selectMode && (
                                                                        <input
                                                                            type="checkbox"
                                                                            className="card-checkbox"
                                                                            checked={selectedIds.has(v.id)}
                                                                            onChange={() => handleToggleSelect(v.id)}
                                                                            onClick={e => e.stopPropagation()}
                                                                        />
                                                                    )}
                                                                    <Link to={`/admin/paciente-profile/${v.pacienteId}`} onClick={e => e.stopPropagation()}>{v.pacienteName}</Link>
                                                                    {v.appliedDosage && <small>{v.appliedDosage}</small>}
                                                                </div>
                                                                <div className="sublist-item-status">
                                                                    <span className={`status-badge ${statusKey}`}>{statusInfo.label}</span>
                                                                    <strong>{v.dueDate.toLocaleDateString("es-AR")}</strong>
                                                                    {!selectMode && (
                                                                        <button className="sublist-delete-btn" title="Eliminar" onClick={() => handleDeleteVencimiento(v)}>
                                                                            <FaTrash />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-results">No hay productos con vencimientos.</p>
                                    )}
                                </div>
                            )}
        
                            {isLoadingMore && <p>Cargando más...</p>}
                            {!isLoading && hasMore && (
                                <div className="load-more-container">
                                    <button onClick={handleLoadMore} disabled={isLoadingMore}>
                                        Cargar Más
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        );
};

export default MonitorVencimientos;