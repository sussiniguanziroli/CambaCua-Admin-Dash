import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AddProduct from './AddProducts';
import EditProduct from './EditProduct';
import ProductList from './ProductList';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`dashboard ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="toggle-button" onClick={toggleSidebar}>
        {isSidebarOpen ? '➖' : 'Menu'}
      </button>
      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <ul>
          <li><Link to="/admin/add-product">Agregar Producto</Link></li>
          <li><Link to="/admin/products">Ver Productos</Link></li>
        </ul>
      </nav>
      <div className="content">
        <Routes>
          <Route path="/admin/add-product" element={<AddProduct />} />
          <Route path="/admin/products" element={<ProductList />} />
          <Route path="/admin/edit-product/:id" element={<EditProduct />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
