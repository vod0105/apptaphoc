import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Concentrate from './pages/Concentrate';
import StudyHistory from './pages/StudyHistory';
import ManageJobs from './pages/ManageJobs';
import MyStudyCalendar from './pages/MyStudyCalendar';

function App() {
  const [notificationPermissionRequested, setNotificationPermissionRequested] = useState(false);

  useEffect(() => {
    // Chỉ yêu cầu quyền lần đầu khi PWA được mở từ Home Screen
    if ('Notification' in window && !notificationPermissionRequested && window.matchMedia('(display-mode: standalone)').matches) {
      const requestPermission = () => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Đã cấp phép thông báo');
            navigator.serviceWorker.ready.then(registration => {
              registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: 'BC5kR26ZaNi22hxjiOjGJb4VRf537r-ZEL3yhBfMpphjwmlAAYnLr3AoWHuIVfOV9sAyQlEF5LhT6yO9aYkXu-E' // Thay bằng key thực
              }).then(subscription => {
                fetch('/subscribe', {
                  method: 'POST',
                  body: JSON.stringify(subscription),
                  headers: { 'Content-Type': 'application/json' }
                }).then(() => console.log('Đăng ký subscription thành công'))
                  .catch(err => console.error('Lỗi đăng ký:', err));
              }).catch(err => console.error('Lỗi subscribe:', err));
            });
          }
          setNotificationPermissionRequested(true); // Đánh dấu đã yêu cầu
        });
      };

      // Kích hoạt yêu cầu quyền (cần hành động người dùng trên iOS)
      requestPermission(); // Gọi trực tiếp để test, nhưng nên gắn vào nút trong production
    }
  }, [notificationPermissionRequested]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/concentrate" element={<Concentrate />} />
        <Route path="/history" element={<StudyHistory />} />
        <Route path="/manage-jobs" element={<ManageJobs />} />
        <Route path="/my-study-calendar" element={<MyStudyCalendar />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
