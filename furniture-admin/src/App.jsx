import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import MainLayout from "./layout/MainLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";

import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import CreateOrder from "./pages/CreateOrder";

import Products from "./pages/Products";
import EmployeeList from "./pages/EmployeeList";
import EmployeeLedger from "./pages/EmployeeLedger";
import Materials from "./pages/Materials";
import Settings from "./pages/Settings";

import BillingList from "./pages/BillingList";
import BillingForm from "./pages/BillingForm";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />

          {/* DASHBOARD */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* ANALYTICS */}
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Analytics />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* ORDERS LIST */}
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Orders />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* CREATE OR EDIT ORDER */}
          <Route
            path="/createorder"
            element={
              <PrivateRoute>
                <MainLayout>
                  <CreateOrder />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* ORDER DETAILS */}
          <Route
            path="/orders/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <OrderDetails />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* PRODUCTS */}
          <Route
            path="/products"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Products />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* EMPLOYEES */}
          <Route
            path="/employees"
            element={
              <PrivateRoute>
                <MainLayout>
                  <EmployeeList />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/employees/ledger/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <EmployeeLedger />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* MATERIALS */}
          <Route
            path="/materials"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Materials />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* SETTINGS */}
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* ⭐ BILLING MODULE ⭐ */}

          {/* BILLING LIST (only bills visible) */}
          <Route
            path="/billing"
            element={
              <PrivateRoute>
                <MainLayout>
                  <BillingList />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* CREATE NEW BILL */}
          <Route
            path="/billing/new"
            element={
              <PrivateRoute>
                <MainLayout>
                  <BillingForm />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* VIEW / EDIT BILL */}
          <Route
            path="/billing/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <BillingForm />
                </MainLayout>
              </PrivateRoute>
            }
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
