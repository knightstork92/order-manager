import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import OrderPage from "./pages/OrderPage";
import OrderPageSearch from "./pages/OrderPageSearch"; // nếu chưa import
import TimesheetPage from "./pages/TimesheetPage";
import UserPage from "./pages/UserPage";
import LoginPage from "./pages/LoginPage";
import PaymentPage from "./pages/PaymentPage";
import ReportPage from "./pages/ReportPage";
import TimesheetReportPage from "./pages/TimesheetReportPage";
import PrivateRoute from "./components/PrivateRoute";
import PartnerPaymentPage from "./pages/PartnerPaymentPage";
import EmployeePaymentPage from "./pages/EmployeePaymentPage";
import GameAccountPage from "./pages/GameAccountPage";
import BoostingManager from "./pages/BoostingManager";
import BoostingPriceManager from "./pages/BoostingPriceManager";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🟢 Trang đăng nhập - không cần quyền */}
        <Route path="/login" element={<LoginPage />} />

        {/* 🔐 Các trang bên trong đều được bảo vệ */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* 📦 Trang Đơn hàng (mọi role đều truy cập được) */}
          <Route index element={<OrderPage />} />
	      <Route path="/orders/search" element={<OrderPageSearch />} />  {/* 👈 dòng cần thêm */}
          {/* 👤 Quản lý người dùng - chỉ admin */}
          <Route
            path="users"
            element={
              <PrivateRoute requiredRole="admin">
                <UserPage />
              </PrivateRoute>
            }
          />

          {/* ⏱ Chấm công - admin và employee */}
          <Route
            path="timesheet"
            element={
              <PrivateRoute allowedRoles={["admin", "employee"]}>
                <TimesheetPage />
              </PrivateRoute>
            }
          />

          {/* Tài khoản - admin và employee */}
          <Route
            path="game-accounts"
            element={
              <PrivateRoute allowedRoles={["admin", "employee"]}>
                <GameAccountPage />
              </PrivateRoute>
            }
          />

          {/* 💵 Quản Lý Game Boosting - ❗️chỉ admin */}
          <Route
            path="boosting-manager"
            element={
              <PrivateRoute requiredRole="admin">
                <BoostingManager />
              </PrivateRoute>
            }
          />

          {/* 💵 Quản Lý Giá Game Boosting - View cho employee và đối tác */}
          <Route
            path="boosting-price-manager"
            element={
              <PrivateRoute allowedRoles={["admin", "employee", "partner"]}>
                <BoostingPriceManager />
              </PrivateRoute>
            }
          />

          {/* 💵 Thanh toán - ❗️chỉ admin */}
          <Route
            path="payment"
            element={
              <PrivateRoute requiredRole="admin">
                <PaymentPage />
              </PrivateRoute>
            }
          />

          {/* 💵 Thanh toán đối tác  - ❗️chỉ admin */}
          <Route
            path="payment/partner"
            element={
              <PrivateRoute requiredRole="admin">
                <PartnerPaymentPage />
              </PrivateRoute>
            }
          />

          {/* 💵 Thanh toán cho nhân viên  - ❗️chỉ admin */}
          <Route
            path="payment/employee-payment"
            element={
              <PrivateRoute requiredRole="admin">
                <EmployeePaymentPage />
              </PrivateRoute>
            }
          />

          {/* 📊 Thống kê đơn hàng - chỉ admin */}
          <Route
            path="report"
            element={
              <PrivateRoute requiredRole="admin">
                <ReportPage />
              </PrivateRoute>
            }
          />

          {/* 📊 Thống kê chấm công - chỉ admin */}
          <Route
            path="report-timesheet"
            element={
              <PrivateRoute requiredRole="admin">
                <TimesheetReportPage />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;