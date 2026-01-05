import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import MainLayout from "./layout/MainLayout";

/* ================= PAGES ================= */
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

import BillingForm from "./pages/BillingForm";

import InvoicePreview from "./pages/InvoicePreview";
import ProductInvoicePreview from "./pages/ProductInvoicePreview";
import InvoiceList from "./pages/InvoiceList";
import DueInvoices from "./pages/DueInvoices";

import Receipts from "./pages/Receipts";
import ReceiptPreview from "./pages/ReceiptPreview";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ================= PUBLIC ================= */}
          <Route path="/login" element={<Login />} />

          {/* ================= DASHBOARD ================= */}
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

          {/* ================= ADMIN ONLY ================= */}
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <MainLayout>
                    <Analytics />
                  </MainLayout>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <MainLayout>
                    <EmployeeList />
                  </MainLayout>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/receipts"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <MainLayout>
                    <Receipts />
                  </MainLayout>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          {/* ================= ORDERS ================= */}
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

          {/* ================= PRODUCTS ================= */}
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

          {/* ================= MATERIALS ================= */}
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

          {/* ================= BILLING ================= */}
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

          {/* ================= INVOICES ================= */}
          <Route
            path="/invoices"
            element={
              <PrivateRoute>
                <MainLayout>
                  <InvoiceList />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/invoice/order/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <InvoicePreview />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/invoice/product/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ProductInvoicePreview />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/invoices/due"
            element={
              <PrivateRoute>
                <MainLayout>
                  <DueInvoices />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* ================= RECEIPTS ================= */}
          <Route
            path="/receipts/preview/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ReceiptPreview />
                </MainLayout>
              </PrivateRoute>
            }
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
