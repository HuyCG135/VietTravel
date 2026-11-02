import { Navigate, Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ChatWidget from '../features/chat/ChatWidget';
import { getUser } from '../features/auth/auth.api';
import { homeForRole, isStaff } from '../features/admin/dashboard/menuConfig';

export default function MainLayout() {
     const user = getUser();

     // Nhân viên chỉ làm việc trong khu quản trị: vào site khách sẽ được đưa
     // thẳng về trang chủ của role thay vì hiển thị giao diện công khai.
     if (isStaff(user?.role)) {
          return <Navigate to={homeForRole(user.role)} replace />;
     }

     return (
          <>
               <Header />
               <main>
                    <Outlet />
               </main>
               <Footer />
               <ChatWidget />
          </>
     );
}
