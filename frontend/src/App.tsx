import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Dynamic code-split route components for rapid initial page load
const LandingPage = lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./components/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CartPage = lazy(() => import('./components/cart/CartPage').then(m => ({ default: m.CartPage })));
const WishlistPage = lazy(() => import('./components/wishlist/WishlistPage').then(m => ({ default: m.WishlistPage })));
const ProfilePage = lazy(() => import('./components/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MyOrdersPage = lazy(() => import('./components/orders/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })));
const AdminDashboardPage = lazy(() => import('./components/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const RetailStaffDashboardPage = lazy(() => import('./components/retail-staff/RetailStaffDashboardPage').then(m => ({ default: m.RetailStaffDashboardPage })));
const ProductionStaffDashboardPage = lazy(() => import('./components/production-staff/ProductionStaffDashboardPage').then(m => ({ default: m.ProductionStaffDashboardPage })));
const WorkerDashboardPage = lazy(() => import('./components/worker/WorkerDashboardPage').then(m => ({ default: m.WorkerDashboardPage })));
const CarrierDashboardPage = lazy(() => import('./components/carrier/CarrierDashboardPage').then(m => ({ default: m.CarrierDashboardPage })));
const DeliveryPersonnelDashboardPage = lazy(() => import('./components/delivery-personnel/DeliveryPersonnelDashboardPage').then(m => ({ default: m.DeliveryPersonnelDashboardPage })));
const ProductDetailPage = lazy(() => import('./components/product/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));

const ViewLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5EFE6] text-[#2C241D] p-6 font-sans">
    <div className="relative w-12 h-12 mb-3">
      <div className="box-border absolute inset-0 border-3 border-[#38A132]/20 border-t-[#38A132] rounded-full animate-spin" />
      <div className="absolute inset-1.5 bg-[#38A132]/10 rounded-full" />
    </div>
    <p className="text-xs font-semibold text-[#7A6C5E] tracking-wider uppercase">Loading...</p>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<ViewLoadingFallback />}>
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

          {/* Workshop Artisan Worker Portal Dashboard Route */}
          <Route path="/worker/*" element={<WorkerDashboardPage />} />
          <Route path="/worker-dashboard/*" element={<WorkerDashboardPage />} />

          {/* Carrier Partner Logistics Portal Dashboard Route */}
          <Route path="/carrier/*" element={<CarrierDashboardPage />} />

          {/* Delivery Personnel / Driver Portal Dashboard Route */}
          <Route path="/delivery-personnel/*" element={<DeliveryPersonnelDashboardPage />} />
          <Route path="/driver/*" element={<DeliveryPersonnelDashboardPage />} />

          {/* Fallback redirect to Landing Page / */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
