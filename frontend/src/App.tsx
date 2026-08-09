import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { CartPage } from './components/cart/CartPage';
import { WishlistPage } from './components/wishlist/WishlistPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { MyOrdersPage } from './components/orders/MyOrdersPage';
import { AdminDashboardPage } from './components/admin/AdminDashboardPage';
import { RetailStaffDashboardPage } from './components/retail-staff/RetailStaffDashboardPage';
import { ProductionStaffDashboardPage } from './components/production-staff/ProductionStaffDashboardPage';
import { ProductDetailPage } from './components/product/ProductDetailPage';
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page is the primary route / */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Furniture Store Dashboard, Cart, Wishlist, Orders & Profile Routes */}
        <Route path="/dashboard/*" element={<DashboardPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<MyOrdersPage />} />
        <Route path="/my-orders" element={<MyOrdersPage />} />
        <Route path="/discounts" element={<Navigate to="/dashboard" replace />} />
        <Route path="/my-discounts" element={<Navigate to="/dashboard" replace />} />

        {/* Admin Portal Dashboard Route */}
        <Route path="/admin/*" element={<AdminDashboardPage />} />

        {/* Retail Staff Portal Dashboard Route */}
        <Route path="/retail-staff/*" element={<RetailStaffDashboardPage />} />

        {/* Production Staff Portal Dashboard Route */}
        <Route path="/production-staff/*" element={<ProductionStaffDashboardPage />} />

        {/* Fallback redirect to Landing Page / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
