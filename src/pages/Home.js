import React, { useState, useEffect, use } from "react";
import { FaPlay, FaCalendar, FaHistory, FaPage4 } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import "../styles/Home.css";
import defaultAvatar from "../assets/defaultAvatar.jpg";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { FaSignInAlt } from "react-icons/fa";


function Home() {
  const navigate = useNavigate();
  const [focusTime, setFocusTime] = useState(30);
  const [selectedJob, setSelectedJob] = useState(null);
  const [todayStudyTime, setTodayStudyTime] = useState(126);
  const [user, setUser] = useState(null); // user login state
  const [showLogout, setShowLogout] = useState(false);
  const [jobs, setJobs] = useState([{ id: 1, name: "General" }]); // jobs from firestore
  const [todaySessions, setTodaySessions] = useState([]); // today's study sessions
  const { theme, toggleTheme } = useTheme();


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.ready.then(registration => {
    registration.pushManager.getSubscription().then(subscription => {
      if (subscription) {
        // Gửi subscription lên server
        fetch('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Lỗi subscribe:', err));

        // Gửi lịch lên server
        const schedule = [
          {
            time: new Date('2025-10-13T12:15:00+07:00').getTime(), // 09:30 AM ngày 13/10/2025
            name: 'Học tập buổi sáng'
          }
        ];
        fetch('/api/set-schedule', {
          method: 'POST',
          body: JSON.stringify({ schedule }),
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Lỗi gửi lịch:', err));
      }
    });
  });
}
  }, []);

  useEffect(() => {
    if (user) {
      const fetchTodayStudyTime = async () => {
        try {
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

          const q = query(
            collection(db, "studySessions"),
            where("userId", "==", user.uid),
            where("createdAt", ">=", startOfDay),
            where("createdAt", "<=", endOfDay)
          );

          // Query 2: tất cả weekly and daily repeat
          const q2 = query(
            collection(db, "studySessions"),
            where("userId", "==", auth.currentUser.uid),
            where("repeat", "in", ["weekly", "daily"])
          );
          const [snapshot, snapshotRepeat] = await Promise.all([
            getDocs(q),
            getDocs(q2)
          ]);
          let totalMinutes = 0;
          let sessions = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            sessions.push({ id: doc.id, ...data }); // thêm vào danh sách
            if (data.actualFocusMinutes) {
              totalMinutes += data.actualFocusMinutes;
            }
          });

          snapshotRepeat.forEach((doc) => {
            const data = doc.data();
            if (data.daysOfWeek.includes(now.getDay())) {

            }

          });


          setTodayStudyTime(totalMinutes);
          setTodaySessions(sessions);

          // if ('serviceWorker' in navigator && 'PushManager' in window) {
          //   navigator.serviceWorker.ready.then(registration => {
          //     registration.pushManager.getSubscription().then(subscription => {
          //       if (subscription) {
          //         const checkSchedule = () => {
          //           const now = new Date();
          //           sessions.forEach(session => {
          //             const sessionTime = session.createdAt?.toDate ? session.createdAt.toDate().getTime() : null;
          //             if (sessionTime) {
          //               const fiveMinutesBefore = sessionTime - 5 * 60 * 1000;
          //               if (now.getTime() >= fiveMinutesBefore && now.getTime() < sessionTime) {
          //                 fetch('/send-notification', {
          //                   method: 'POST',
          //                   body: JSON.stringify({
          //                     subscription: subscription,
          //                     title: 'Nhắc nhở học tập',
          //                     body: `Bạn sắp bắt đầu phiên học: ${session.name || 'Chưa có tên'} lúc ${new Date(sessionTime).toLocaleTimeString()}`,
          //                     url: '/Home'
          //                   }),
          //                   headers: { 'Content-Type': 'application/json' }
          //                 }).catch(err => console.error('Lỗi gửi thông báo:', err));
          //               }
          //             }
          //           });
          //         };

          //         // Kiểm tra mỗi phút
          //         const interval = setInterval(checkSchedule, 60000);
          //         checkSchedule(); // Kiểm tra ngay khi mount
          //         return () => clearInterval(interval); // Dọn dẹp khi unmount
          //       }
          //     });
          //   });
          // }

        } catch (err) {
          console.error("Error fetching today's study time:", err);
        }
      };

      fetchTodayStudyTime();

      const fetchJobs = async () => {
        if (!user) return;
        const q = query(collection(db, "jobs"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          // Nếu chưa có job nào thì tạo "General"
          const docRef = await addDoc(collection(db, "jobs"), {
            name: "General",
            userId: user.uid,
          });

          setJobs([{ id: docRef.id, name: "General", userId: user.uid }]);
        } else {
          setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      };
      fetchJobs();
    }
  }, [user]);


  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogout(false);
    } catch (err) {
      console.error(err);
    }
  };

  const formatStudyTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleTimeChange = (time) => {
    setFocusTime((prev) => Math.max(15, prev + time));
  };

  const handleStart = () => {
    if (!focusTime || !selectedJob) {
      alert("Vui lòng nhập thời gian học và chọn công việc!");
      return;
    }
    const userId = user ? user.uid : null;
    navigate("/concentrate", { state: { focusTime, selectedJob, userId } });
  };

  const handleHistory = () => {
    if (!user) {
      alert("Vui lòng đăng nhập để xem lịch sử học tập!");
      return;
    }
    navigate("/history");
  }

  const handleCalender = () => {
    if (!user) {
      alert("Vui lòng đăng nhập để xem lịch sử học tập!");
      return;
    }
    navigate("/my-study-calendar");
  }

  const handleContinue = (session) => {
    if (!session.userId) {
      console.warn("Không có userId, không thể tiếp tục.");
      return;
    }

    // Có userId thì mới điều hướng hoặc cập nhật
    navigate("/concentrate", {
      state: {
        focusTime: session.remainingMinutes,
        selectedJob: session.job,
        userId: session.userId,
        sectionId: session.id,
      },
    });
  }

  const requestNotificationPermission = () => {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Đã cấp phép thông báo');
        navigator.serviceWorker.ready.then(registration => {
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
          }).then(subscription => {
            fetch('/subscribe', {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      }
    });
  }
};

  return (
    <div className="app-container">
      <h1 className="main-title">FocusTime</h1>
      {/* Nếu chưa đăng nhập */}
      {!user ? (
        <button className="login-button" onClick={handleGoogleLogin}>
          <FaSignInAlt className="text-black text-xl" />
        </button>
      ) : (
        <div className="user-section">
          <img
            src={user.photoURL || defaultAvatar}
            alt="avatar"
            className="user-avatar"
            onClick={() => setShowLogout((prev) => !prev)}
          />
          {showLogout && (
            <div className="user-menu">
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
              <button className="notification-button" onClick={requestNotificationPermission}>
                Notification
              </button>
            </div>

          )}
        </div>
      )}
      <p className="today-time">
        Thời gian học hôm nay: <strong>{formatStudyTime(todayStudyTime)}</strong>
      </p>
      <div className="session-list-today">
        {todaySessions.length > 0 ? (
          todaySessions.map((session) => {
            const percent = Math.min(
              Math.round((session.actualFocusMinutes / session.totalFocusMinutes) * 100),
              100
            );

            return (
              <button
                key={session.id}
                className="session-card-btn-today"
                onClick={() => handleContinue(session)}
              >
                <h3 className="session-job-today">📘 {session.job}</h3>
                <p className="session-date-today">
                  {session.createdAt.toDate().toLocaleString().split(", ")[1]}
                </p>

                <div className="progress-container-today">
                  <div className="progress-bar-today">
                    <div
                      className="progress-fill-today"
                      style={{ width: `${percent}%` }}
                    >
                      {percent}%
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <p>Chưa có phiên học nào hôm nay.</p>
        )}
      </div>

      {/* Job chọn */}
      <div className="job-header">
        <h2 className="job-title">Job:</h2>
        <button className="job-manager" onClick={() => navigate("/manage-jobs")}>⚙️</button>
      </div>
      <div className="job-options">
        {jobs.map((job) => (
          <button
            key={job.name}
            className={`job-button ${selectedJob === job.name ? "selected" : ""}`}
            onClick={() => setSelectedJob(job.name)}
          >
            {/* <span className="job-icon">{job.icon}</span> */}
            {job.name}
          </button>
        ))}
      </div>

      {/* Focus Time */}
      <div className="focus-time">
        <h3>Focus Time</h3>
        <div className="time-controls">
          <span className="limit">15m</span>
          <button onClick={() => handleTimeChange(-15)}>-</button>
          <span className="time">{focusTime} mins</span>
          <button onClick={() => handleTimeChange(15)}>+</button>
          <span className="limit">60m</span>
        </div>
      </div>

      {/* Start + History */}
      <div className="bottom-nav">
        <button className="start-btn" onClick={handleStart}>
          <div className="play-icon"><FaPlay /></div>
        </button>
        <button className="left-btn" onClick={handleHistory}>
          <FaHistory />
          History
        </button>
        <button className="right-btn" onClick={handleCalender}>
          <FaCalendar />
          Calendar
        </button>
      </div>


      {/* Toggle theme */}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === "light" ? "🌙" : "☀️"}
      </button>
    </div>
  );
}

export default Home;
