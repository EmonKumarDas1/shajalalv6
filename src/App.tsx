import { Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import LoginForm from "./components/auth/LoginForm";
import Dashboard from "./components/pages/dashboard";
import Products from "./components/pages/products";
import AddProduct from "./components/pages/add-product";
import ProductDetails from "./components/pages/product-details";
import Orders from "./components/pages/orders";
import Suppliers from "./components/pages/suppliers";
import Shops from "./components/pages/shops";
import Invoices from "./components/pages/invoices";
import InvoiceDetailPage from "./components/pages/invoice-detail";
import SellProduct from "./components/pages/sell-product";
import Success from "./components/pages/success";
import Profile from "./components/pages/profile";
import Employees from "./components/pages/employees";
import Costs from "./components/pages/costs";
import EmployeeSalaryPage from "./components/pages/employee-salary";
import Customers from "./components/pages/customers";
import Returns from "./components/pages/returns";
import Chalans, { ChalanDetail } from "./components/pages/chalans";
import { AuthProvider, useAuth } from "../supabase/auth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen } from "./components/ui/loading-spinner";
import { startSupabaseKeepAlive } from "./lib/supabase-keepalive";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        {/* Make login the default landing page */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/products"
          element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/products/add"
          element={
            <PrivateRoute>
              <AddProduct />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/products/:id"
          element={
            <PrivateRoute>
              <ProductDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/shops"
          element={
            <PrivateRoute>
              <Shops />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/suppliers"
          element={
            <PrivateRoute>
              <Suppliers />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/invoices"
          element={
            <PrivateRoute>
              <Invoices />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/invoices/:id"
          element={
            <PrivateRoute>
              <InvoiceDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/sell-product"
          element={
            <PrivateRoute>
              <SellProduct />
            </PrivateRoute>
          }
        />
        <Route path="/success" element={<Success />} />

        {/* Profile route */}
        <Route
          path="/dashboard/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Employee management route */}
        <Route
          path="/dashboard/employees"
          element={
            <PrivateRoute>
              <Employees />
            </PrivateRoute>
          }
        />

        {/* Other costs route */}
        <Route
          path="/dashboard/costs"
          element={
            <PrivateRoute>
              <Costs />
            </PrivateRoute>
          }
        />

        {/* Employee Salary route */}
        <Route
          path="/dashboard/employee-salary"
          element={
            <PrivateRoute>
              <EmployeeSalaryPage />
            </PrivateRoute>
          }
        />

        {/* Customers route */}
        <Route
          path="/dashboard/customers"
          element={
            <PrivateRoute>
              <Customers />
            </PrivateRoute>
          }
        />

        {/* Returns route */}
        <Route
          path="/dashboard/returns"
          element={
            <PrivateRoute>
              <Returns />
            </PrivateRoute>
          }
        />

        {/* Chalans route */}
        <Route
          path="/dashboard/chalans"
          element={
            <PrivateRoute>
              <Chalans />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/chalans/:id"
          element={
            <PrivateRoute>
              <ChalanDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/chalans/:id/download"
          element={
            <PrivateRoute>
              <ChalanDetail />
            </PrivateRoute>
          }
        />

        {/* Add this before any catchall route */}
        {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

        {/* Catch-all route for dashboard paths */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Redirect all other routes to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
    </>
  );
}

function App() {
  // Initialize Supabase keep-alive mechanism
  useEffect(() => {
    // Start the keep-alive with a 5-minute interval (300000ms)
    const cleanup = startSupabaseKeepAlive(300000);

    // Clean up the interval when the component unmounts
    return cleanup;
  }, []);

  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen text="Loading application..." />}>
        <AppRoutes />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
