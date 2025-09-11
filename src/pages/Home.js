import React, { useState, useEffect, use } from "react";
import { FaPlay, FaCalendar, FaHistory, FaPage4 } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import "../styles/Home.css";
import defaultAvatar from "../assets/defaultAvatar.jpg";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";


function Home() {
  const navigate = useNavigate();
  const [focusTime, setFocusTime] = useState(30);
  const [selectedJob, setSelectedJob] = useState(null);
  const [todayStudyTime, setTodayStudyTime] = useState(126);
  const [user, setUser] = useState(null); // user login state
  const [showLogout, setShowLogout] = useState(false);
  const [jobs, setJobs] = useState([{ id: 1, name: "General" }]); // jobs from firestore

  const { theme, toggleTheme } = useTheme();


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
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

          const snapshot = await getDocs(q);

          let totalMinutes = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.actualFocusMinutes) {
              totalMinutes += data.actualFocusMinutes;
            }
          });

          setTodayStudyTime(totalMinutes);
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

  return (
    <div className="app-container">
      <h1 className="main-title">FocusTime</h1>
      <p className="today-time">
        Thời gian học hôm nay: <strong>{formatStudyTime(todayStudyTime)}</strong>
      </p>

      {/* Nếu chưa đăng nhập */}
      {!user ? (
        <button className="login-button" onClick={handleGoogleLogin}>
          Đăng nhập bằng Google
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
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      )}

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
    <div className="play-icon"><FaPlay/></div>
  </button>
  <button className="left-btn" onClick={handleCalender}>
    <FaCalendar />
    Calendar
    </button>
  <button className="right-btn" onClick={handleHistory}>
    <FaHistory />
    History
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
