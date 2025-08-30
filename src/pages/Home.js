import React, { useState, useEffect, use } from "react";
import { FaBookOpen, FaPencilAlt, FaGlobe, FaCalculator, FaHistory, FaPlay } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import "../styles/Home.css";
import { collection, query, where, getDocs } from "firebase/firestore";


function Home() {
  const navigate = useNavigate();
  const [focusTime, setFocusTime] = useState(30);
  const [selectedJob, setSelectedJob] = useState(null);
  const [todayStudyTime, setTodayStudyTime] = useState(126);
  const [user, setUser] = useState(null); // user login state
  const [showLogout, setShowLogout] = useState(false);

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
    setFocusTime((prev) => Math.max(15, Math.min(60, prev + time)));
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

  const jobs = [
    { name: "English", icon: <FaGlobe /> },
    { name: "Reading", icon: <FaBookOpen /> },
    { name: "Math", icon: <FaCalculator /> },
    { name: "Writing", icon: <FaPencilAlt /> },
  ];

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
            src={user.photoURL}
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
      <h2 className="job-title">Job:</h2>
      <div className="job-options">
        {jobs.map((job) => (
          <button
            key={job.name}
            className={`job-button ${selectedJob === job.name ? "selected" : ""}`}
            onClick={() => setSelectedJob(job.name)}
          >
            <span className="job-icon">{job.icon}</span>
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
      <button className="start-button" onClick={handleStart}>
        <FaPlay className="play-icon" /> Start
      </button>
      <button className="history-button" onClick={handleHistory}>
        <FaHistory className="history-icon" /> History
      </button>
    </div>
  );
}

export default Home;
