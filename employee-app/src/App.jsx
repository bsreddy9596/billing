// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import MainLayout from "./layout/MainLayout";
import PrivateRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import Orders from "./pages/Orders/Orders";
import CreateOrder from "./pages/Orders/CreateOrder";
import OrderDetails from "./pages/Orders/OrderDetails";

import BillingForm from "./pages/Billing/BillingForm";
import BillingList from "./pages/Billing/BillingList";

import Products from "./pages/Products/EmployeeProducts";

import MaterialEntry from "./pages/Materials/MaterialEntry";
import MaterialList from "./pages/Materials/MaterialList";

import EmployeeLedger from "./pages/EmployeeLedger";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/login" element={<Login />} />

          <Route element={<PrivateRoute />}>
            <Route element={<MainLayout />}>

              <Route path="/" element={<Dashboard />} />

              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/create" element={<CreateOrder />} />
              <Route path="/orders/:orderId" element={<OrderDetails />} />

              <Route path="/billing" element={<BillingList />} />
              <Route path="/billing/create" element={<BillingForm />} />
              <Route path="/billing/:id" element={<BillingForm />} />

              <Route path="/products" element={<Products />} />

              <Route path="/materials" element={<MaterialList />} />
              <Route path="/materials/entry" element={<MaterialEntry />} />

              <Route path="/ledger" element={<EmployeeLedger />} />

            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
