// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const { role } = currentUser;

  const linkClass = ({ isActive }) =>
    isActive ? "text-blue-700 font-semibold flex items-center gap-2" : "text-gray-700 hover:text-blue-700 flex items-center gap-2";

  const Section = ({ title, children }) => (
    <div className="mb-4">
      <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">{title}</h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );

  return (
    <aside className="w-64 bg-white shadow h-full p-4 border-r">
      <h2 className="text-xl font-bold mb-6">Knight Team</h2>
      <nav className="text-sm">

       <Section title="Quản lý đơn hàng">
		  <NavLink to="/" className={linkClass}>📦 Đơn hàng</NavLink>
		  <NavLink to="/orders/search" className={linkClass}>
			🔍 Tìm kiếm đơn hàng (chỉ dùng khi cần)
		  </NavLink>
		</Section>


        {(role === "admin" || role === "employee") && (
          <Section title="Chấm công & nhân sự">
            {role === "admin" && <NavLink to="/users" className={linkClass}>👥 Người dùng</NavLink>}
            <NavLink to="/timesheet" className={linkClass}>🕒 Chấm công</NavLink>
          </Section>
        )}

        {(role === "admin" || role === "employee") && (
          <Section title="Tài khoản game">
            <NavLink to="/game-accounts" className={linkClass}>🎮 Quản lý tài khoản</NavLink>
          </Section>
        )}

        {role === "admin" && (
          <Section title="Dịch vụ Boosting">
            <NavLink to="/boosting-manager" className={linkClass}>⚙️ Cấu hình Boosting</NavLink>
          </Section>
        )}

        {["admin", "employee", "partner"].includes(role) && (
          <Section title="Bảng giá dịch vụ">
            <NavLink to="/boosting-price-manager" className={linkClass}>💸 Bảng giá Boosting</NavLink>
          </Section>
        )}

        {role === "admin" && (
          <Section title="Thanh toán">
            <NavLink to="/payment" className={linkClass}>💰 Tổng quan</NavLink>
            <NavLink to="/payment/partner" className={linkClass}>🤝 Đối tác</NavLink>
            <NavLink to="/payment/employee-payment" className={linkClass}>👤 Nhân viên</NavLink>
          </Section>
        )}

        {role === "admin" && (
          <Section title="Thống kê & báo cáo">
            <NavLink to="/report" className={linkClass}>📊 Đơn hàng</NavLink>
            <NavLink to="/report-timesheet" className={linkClass}>📈 Chấm công</NavLink>
          </Section>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
