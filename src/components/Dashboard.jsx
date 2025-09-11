import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import AddProduct from './AddProducts';
import EditProduct from './EditProduct';
import ProductList from './ProductList';
import HandleOrders from './HandleOrders';
import PedidosCompletados from "./PedidosCompletados";
import UserList from "./userManagement/UserList";
import PromosAdmin from './PromosAdmin';
import CouponAdmin from './CouponAdmin';
import PresentialList from './presencial/PresentialList';
import AddPresential from './presencial/AddPresential';
import EditPresential from './presencial/EditPresential';

import {
    FaStore, FaShoppingCart, FaUsers, FaTag, FaTicketAlt,
    FaPlus, FaListUl, FaHistory, FaHeartbeat, FaStethoscope,
    FaBars, FaTimes, FaChevronDown, FaBuilding, FaUserCircle, FaSignOutAlt
} from 'react-icons/fa';

const Dashboard = ({ user, handleLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [openCategory, setOpenCategory] = useState('Ventas y Pedidos');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const location = useLocation();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleCategory = (category) => setOpenCategory(openCategory === category ? null : category);
    const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setIsSidebarOpen(true);
            else setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (window.innerWidth <= 768) setIsSidebarOpen(false);
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileRef]);

    const menuCategories = [
        {
            name: 'Ventas y Pedidos',
            icon: <FaShoppingCart />,
            items: [
                { path: '/admin/orders', label: 'Gestionar Pedidos', icon: <FaListUl /> },
                { path: '/admin/orders/complete', label: 'Historial Pedidos', icon: <FaHistory /> },
            ]
        },
        {
            name: 'Tienda Online',
            icon: <FaStore />,
            items: [
                { path: '/admin/products', label: 'Productos Online', icon: <FaListUl /> },
                { path: '/admin/add-product', label: 'Agregar Producto Online', icon: <FaPlus /> },
                { path: '/admin/promociones', label: 'Promociones', icon: <FaTag /> },
            ]
        },
        {
            name: 'Venta Presencial',
            icon: <FaBuilding />,
            items: [
                { path: '/admin/presential', label: 'Items Presenciales', icon: <FaListUl /> },
                { path: '/admin/add-presential', label: 'Agregar Item Presencial', icon: <FaPlus /> },
            ]
        },
        {
            name: 'Gestión Clínica',
            icon: <FaHeartbeat />,
            items: [
                 { path: '/admin/patients', label: 'Pacientes', icon: <FaStethoscope />, disabled: true },
            ]
        },
        {
            name: 'Administración',
            icon: <FaUsers />,
            items: [
                { path: '/admin/users', label: 'Ver Usuarios', icon: <FaUsers /> },
                { path: '/admin/coupons', label: 'Admin Cupones', icon: <FaTicketAlt /> },
            ]
        }
    ];

    return (
        <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <div className="header-bar">
                <button className="sidebar-toggle-button" onClick={toggleSidebar}>
                    {isSidebarOpen ? <FaTimes /> : <FaBars />}
                </button>
                <div className="header-title">Admin Panel</div>
                <div className="user-profile" ref={profileRef}>
                    <button onClick={toggleProfile} className="profile-button">
                        <FaUserCircle />
                        <span className="user-email-display">{user.email}</span>
                        <FaChevronDown />
                    </button>
                    {isProfileOpen && (
                        <div className="profile-dropdown">
                            <div className="dropdown-email">{user.email}</div>
                            <button onClick={handleLogout} className="logout-button">
                                <FaSignOutAlt /> Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="dashboard-body">
                <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <ul className="sidebar-menu">
                        {menuCategories.map(category => (
                            <li key={category.name} className={`menu-category ${openCategory === category.name ? 'open' : ''}`}>
                                <div className="category-header" onClick={() => toggleCategory(category.name)}>
                                    <span className="category-icon">{category.icon}</span>
                                    <span className="category-name">{category.name}</span>
                                    <FaChevronDown className="category-arrow" />
                                </div>
                                <ul className="submenu">
                                    {category.items.map(item => (
                                        <li key={item.path}>
                                            <NavLink
                                                to={item.path}
                                                className={({ isActive }) => `${isActive ? 'active-link' : ''} ${item.disabled ? 'disabled-link' : ''}`}
                                                onClick={(e) => item.disabled && e.preventDefault()}
                                            >
                                                <span className="item-icon">{item.icon}</span>
                                                {item.label}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </nav>
                <main className="content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/admin/orders" replace />} />
                        <Route path="/admin/add-product" element={<AddProduct />} />
                        <Route path="/admin/products" element={<ProductList />} />
                        <Route path="/admin/edit-product/:id" element={<EditProduct />} />
                        <Route path="/admin/orders" element={<HandleOrders />} />
                        <Route path="/admin/orders/complete" element={<PedidosCompletados />} />
                        <Route path="/admin/users" element={<UserList />} />
                        <Route path="/admin/promociones" element={<PromosAdmin />} />
                        <Route path="/admin/coupons" element={<CouponAdmin />} />
                        <Route path="/admin/presential" element={<PresentialList />} />
                        <Route path="/admin/add-presential" element={<AddPresential />} />
                        <Route path="/admin/edit-presential/:id" element={<EditPresential />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
