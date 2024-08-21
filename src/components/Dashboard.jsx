import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import AddProduct from './AddProducts';
import EditProduct from './EditProduct';
import ProductList from './ProductList';


const Dashboard = () => {
  return (
    <div className="dashboard">
      <nav className="sidebar">
        <ul>
          <li><Link to="/admin/add-product">Agregar Producto</Link></li>
          <li><Link to="/admin/products">Productos</Link></li>
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
