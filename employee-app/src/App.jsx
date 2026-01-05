import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import MainLayout from "./layout/MainLayout";
import PrivateRoute from "./components/ProtectedRoute";

/* ================= PAGES ================= */
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

/* ORDERS */
import Orders from "./pages/Orders/Orders";
import CreateOrder from "./pages/Orders/CreateOrder";
import OrderDetails from "./pages/Orders/OrderDetails";

/* BILLING */
import BillingList from "./pages/Billing/BillingList";
import QuickProductInvoice from "./pages/Billing/QuickProductInvoice";
import DueInvoices from "./pages/Billing/DueInvoices";

/* INVOICE PREVIEWS */
import InvoicePreview from "./pages/Billing/InvoicePreview";
import ProductInvoicePreview from "./pages/Billing/ProductInvoicePreview";

/* PRODUCTS */
import Products from "./pages/Products/EmployeeProducts";

/* MATERIALS */
import MaterialEntry from "./pages/Materials/MaterialEntry";
import MaterialList from "./pages/Materials/MaterialList";

/* LEDGER */
import EmployeeLedger from "./pages/EmployeeLedger";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ================= PUBLIC ================= */}
          <Route path="/login" element={<Login />} />

          {/* ================= PROTECTED ================= */}
          <Route element={<PrivateRoute />}>
            <Route element={<MainLayout />}>

              {/* DASHBOARD */}
              <Route path="/" element={<Dashboard />} />

              {/* ORDERS */}
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/create" element={<CreateOrder />} />
              <Route path="/orders/:orderId" element={<OrderDetails />} />

              {/* BILLING */}
              <Route path="/billing" element={<BillingList />} />
              <Route path="/billing/quick" element={<QuickProductInvoice />} />
              <Route path="/dues" element={<DueInvoices />} />

              {/* INVOICE PREVIEWS */}
              <Route path="/invoice/:id" element={<InvoicePreview />} />
              <Route
                path="/invoice/product/:id"
                element={<ProductInvoicePreview />}
              />

              {/* PRODUCTS */}
              <Route path="/products" element={<Products />} />

              {/* MATERIALS */}
              <Route path="/materials" element={<MaterialList />} />
              <Route path="/materials/entry" element={<MaterialEntry />} />

              {/* LEDGER */}
              <Route path="/ledger" element={<EmployeeLedger />} />

            </Route>
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
