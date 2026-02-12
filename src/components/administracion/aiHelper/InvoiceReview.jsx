import React, { useState, useEffect, useRef } from 'react';
import { FaSave, FaTrash, FaPlus, FaCheckCircle, FaSearch, FaTimes, FaLink } from 'react-icons/fa';
import { collection, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import { db } from '../../../firebase/config';


const InvoiceReview = ({ data, onBack, imageUrl }) => {
  const [items, setItems] = useState([]);
  const [proveedor, setProveedor] = useState(data.proveedor || '');
  const [fecha, setFecha] = useState(data.fecha || new Date().toISOString().split('T')[0]);
  const [globalMargin, setGlobalMargin] = useState(40);
  
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. CARGA DE PRODUCTOS
  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        const [onlineSnap, presentialSnap] = await Promise.all([
          getDocs(collection(db, 'productos')),
          getDocs(collection(db, 'productos_presenciales'))
        ]);

        const parsePrice = (val) => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          return parseFloat(val.toString().replace(',', '.')) || 0;
        };

        const onlineData = onlineSnap.docs.map(doc => ({
          id: doc.id,
          source: 'online',
          nombre: doc.data().nombre || '',
          stock: parseInt(doc.data().stock) || 0,
          precioVenta: parsePrice(doc.data().precio),
          categoria: doc.data().categoria || ''
        }));

        const presentialData = presentialSnap.docs.map(doc => ({
          id: doc.id,
          source: 'presential',
          nombre: doc.data().name || '',
          stock: parseInt(doc.data().stock) || 0,
          precioVenta: parsePrice(doc.data().price),
          categoria: doc.data().category || ''
        }));

        setAllProducts([...onlineData, ...presentialData]);
        setLoadingProducts(false);

      } catch (error) {
        console.error('Error cargando DB:', error);
        setLoadingProducts(false);
      }
    };
    loadAllProducts();
  }, []);

  // 2. MATCH AUTOMÁTICO AL INICIAR
  useEffect(() => {
    if (!loadingProducts && allProducts.length > 0 && data.items && items.length === 0) {
      const initialItems = data.items.map(item => {
        // Normalizamos texto para mejorar búsqueda
        const cleanDesc = item.descripcion?.toLowerCase().trim() || '';
        
        // Búsqueda simple: ¿El nombre del producto contiene la descripción de la factura?
        const match = allProducts.find(p => 
          p.nombre.toLowerCase().includes(cleanDesc) || 
          cleanDesc.includes(p.nombre.toLowerCase())
        );

        const cantidad = Number(item.cantidad) || 1;
        const subtotal = Number(item.subtotal) || 0;
        const costoUnitario = cantidad > 0 ? subtotal / cantidad : 0;
        const suggestedPrice = costoUnitario * (1 + (globalMargin / 100));

        return {
          ...item,
          cantidad,
          subtotal,
          costoUnitario,
          selectedProduct: match || null,
          newSalePrice: suggestedPrice,
          updatePrice: true
        };
      });
      setItems(initialItems);
    }
  }, [loadingProducts, allProducts, data]);

  // 3. RECALCULAR PRECIOS SI CAMBIA EL MARGEN
  useEffect(() => {
    setItems(prev => prev.map(item => ({
      ...item,
      newSalePrice: item.costoUnitario * (1 + (globalMargin / 100))
    })));
  }, [globalMargin]);

  // HELPERS
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'cantidad' || field === 'subtotal') {
      const qty = field === 'cantidad' ? parseFloat(value) : newItems[index].cantidad;
      const sub = field === 'subtotal' ? parseFloat(value) : newItems[index].subtotal;
      
      if (qty > 0) {
        const newCosto = sub / qty;
        newItems[index].costoUnitario = newCosto;
        newItems[index].newSalePrice = newCosto * (1 + (globalMargin / 100));
      }
    }
    setItems(newItems);
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...items];
    newItems[index].selectedProduct = product;
    setItems(newItems);
  };

  const handleSave = async () => {
    const unlinked = items.filter(i => !i.selectedProduct);
    if (unlinked.length > 0) {
      if (!window.confirm(`${unlinked.length} items no están vinculados y se ignorarán. ¿Continuar?`)) return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const item of items) {
        if (item.selectedProduct) {
          const isOnline = item.selectedProduct.source === 'online';
          const collectionName = isOnline ? 'productos' : 'productos_presenciales';
          const ref = doc(db, collectionName, item.selectedProduct.id);
          
          const updates = {
            stock: increment(Number(item.cantidad)),
            updatedAt: new Date()
          };

          if (item.updatePrice && item.newSalePrice > 0) {
            const finalPrice = parseFloat(Number(item.newSalePrice).toFixed(2));
            if (isOnline) {
              updates.precio = finalPrice;
              updates.precioLastUpdated = new Date();
            } else {
              updates.price = finalPrice;
              updates.priceLastUpdated = new Date(); 
            }
          }
          batch.update(ref, updates);
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        setSuccess(true);
        setTimeout(onBack, 2500);
      } else {
        alert('No hay nada para guardar');
        setSaving(false);
      }
    } catch (error) {
      console.error(error);
      alert('Error al guardar');
      setSaving(false);
    }
  };

  if (success) return (
    <div className="success-screen">
      <FaCheckCircle className="success-icon" />
      <h2>¡Inventario Actualizado!</h2>
      <p>Se han cargado los productos correctamente.</p>
    </div>
  );

  return (
    <div className="invoice-review">
      <div className="review-header">
        <div>
          <h2>Revisión de Stock y Precios</h2>
          <p>Confirma los datos antes de impactar en la base de datos</p>
        </div>
        <div className="margin-control">
          <label>Margen Ganancia:</label>
          <div className="input-group">
            <input 
              type="number" 
              value={globalMargin} 
              onChange={(e) => setGlobalMargin(parseFloat(e.target.value))}
            />
            <span>%</span>
          </div>
        </div>
      </div>

      <div className="review-content">
        <div className="image-column">
          <img src={imageUrl} alt="Factura" className="invoice-image" />
        </div>

        <div className="data-column">
          <div className="ai-invoice-list">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{width: '20%'}}>Producto (Factura)</th>
                    <th style={{width: '25%'}}>Vinculación DB</th>
                    <th style={{width: '8%'}} className="text-center">Cant.</th>
                    <th style={{width: '10%'}} className="text-right">Costo</th>
                    <th style={{width: '10%'}} className="text-right">Precio Actual</th>
                    <th style={{width: '12%'}} className="text-right">Nuevo Precio</th>
                    <th style={{width: '5%'}} className="text-center">Act.</th>
                    <th style={{width: '5%'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className={item.updatePrice ? 'updating-price' : ''}>
                      <td>
                        <input
                          type="text"
                          className="bare-input"
                          value={item.descripcion}
                          onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                        />
                      </td>
                      <td>
                        <ProductSearchCell 
                          selectedProduct={item.selectedProduct}
                          allProducts={allProducts}
                          onSelect={(prod) => handleProductSelect(index, prod)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="bare-input text-center"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="text-right cost-cell">
                        ${item.costoUnitario?.toFixed(2)}
                      </td>
                      <td className="text-right current-price-cell">
                        {item.selectedProduct ? `$${item.selectedProduct.precioVenta}` : '-'}
                      </td>
                      <td>
                        <input
                          type="number"
                          className={`bare-input text-right price-input ${item.updatePrice ? 'active' : ''}`}
                          value={item.newSalePrice?.toFixed(2)}
                          onChange={(e) => handleItemChange(index, 'newSalePrice', parseFloat(e.target.value))}
                          disabled={!item.updatePrice}
                        />
                      </td>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          checked={item.updatePrice}
                          onChange={() => {
                            const newItems = [...items];
                            newItems[index].updatePrice = !newItems[index].updatePrice;
                            setItems(newItems);
                          }}
                        />
                      </td>
                      <td>
                        <button className="action-btn" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="action-buttons mt-4" style={{marginTop: '20px'}}>
             <button className="add-item-btn" onClick={() => setItems([...items, { descripcion: '', cantidad: 1, subtotal: 0, costoUnitario: 0, selectedProduct: null, newSalePrice: 0, updatePrice: false }])}>
              <FaPlus /> Fila Manual
            </button>
            <button className="cancel-btn" onClick={onBack}>Cancelar</button>
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : <><FaSave /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de celda de búsqueda mejorado
const ProductSearchCell = ({ selectedProduct, allProducts, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const filtered = allProducts.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="product-search-cell" ref={wrapperRef}>
      {!isOpen ? (
        <div className="selected-display" onClick={() => { setIsOpen(true); setSearchTerm(''); }}>
          {selectedProduct ? (
            <div className="product-info">
              {selectedProduct.nombre}
              <span className={`match-badge ${selectedProduct.source}`}>
                {selectedProduct.source === 'online' ? 'Web' : 'Local'}
              </span>
            </div>
          ) : (
            <span className="placeholder"><FaLink /> Vincular item...</span>
          )}
        </div>
      ) : (
        <div className="search-dropdown">
          <input 
            ref={inputRef}
            type="text" 
            className="search-input"
            placeholder="Escribe para buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="results-list">
            <div className="result-item unlink" onClick={() => { onSelect(null); setIsOpen(false); }}>
              <FaTimes /> Desvincular
            </div>
            {filtered.length > 0 ? filtered.map(prod => (
              <div key={prod.id} className="result-item" onClick={() => { onSelect(prod); setIsOpen(false); }}>
                <div className="item-info">
                  <strong>{prod.nombre}</strong>
                  <small>{prod.categoria}</small>
                </div>
                <span className="price-tag">${prod.precioVenta}</span>
              </div>
            )) : <div className="no-results">No encontrado</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceReview;