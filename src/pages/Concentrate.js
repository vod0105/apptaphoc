import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, setDoc, updateDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import "../styles/Concentrate.css";
import { MoreVertical } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Snowflakes from "../components/Snow";

export default function Concentrate() {
  const { state } = useLocation();
  const initialMinutes =
    state?.minutes ?? state?.studyTime ?? state?.focusTime ?? 0;
  const job = state?.job ?? state?.selectedJob ?? "General";
  const userId = state?.userId ?? null;
  const initSection = state?.sectionId ?? null;

  const [periods, setPeriods] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // index của period hiện tại
  const [secondsLeft, setSecondsLeft] = useState(0); // giây còn lại trong period hiện tại
  const [isRunning, setIsRunning] = useState(true);
  const [sessionId, setSessionId] = useState(initSection); // Lưu ID của document phiên học
  const [actualFocusMinutes, setActualFocusMinutes] = useState(0);
  // Tạo audio object
  const breakSound = new Audio("/sounds/break.mp3");
  const focusSound = new Audio("/sounds/focus.mp3");

  const [viewMode, setViewMode] = useState("circle"); // circle | tree | candle
  const [menuOpen, setMenuOpen] = useState(false);


  const [quote, setQuote] = useState("");
  const quotes = [
    "Hãy bắt đầu ngay cả khi bạn chưa sẵn sàng.",
    "Mỗi ngày là một cơ hội mới để tiến bộ.",
    "Kỷ luật là cầu nối giữa mục tiêu và thành công.",
    "Không có áp lực, không có kim cương.",
    "Bạn giỏi hơn bạn nghĩ rất nhiều.",
    "Thất bại chỉ là bước đệm cho thành công.",
    "Tập trung hôm nay để tự hào ngày mai.",
    "Kiên trì là chìa khóa mở mọi cánh cửa.",
    "Đi chậm không sao, miễn là đừng dừng lại.",
    "Người chiến thắng là người không bao giờ bỏ cuộc."
  ];

  const { theme, toggleTheme } = useTheme();
  const [endTime, setEndTime] = useState(null); // Thời điểm kết thúc thực tế (timestamp)


  // Random 1 câu khi load trang
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  // Tách thời gian thành periods và xử lý phiên học
  useEffect(() => {
    const p = splitIntoPeriods(initialMinutes);
    setPeriods(p);
    if (p.length > 0) setSecondsLeft(p[0].minutes * 60);
    setCurrentIndex(0);
    setIsRunning(true);
    const firstSeconds = p[0].minutes * 60;
    setSecondsLeft(firstSeconds);
    setEndTime(Date.now() + firstSeconds * 1000); // 🔥 phải có dòng này


    const handleSession = async () => {
      if (!userId) return;
      if (sessionId) {
        // Tiếp tục phiên học cũ
        try {
          const sessionRef = doc(db, "studySessions", sessionId);
          const sessionSnap = await getDoc(sessionRef);
          if (sessionSnap.exists()) {
            setActualFocusMinutes(sessionSnap.data().actualFocusMinutes);
          } else {
            console.error("Phiên học không tồn tại:", sessionId);
          }
        } catch (error) {
          console.error("Lỗi khi lấy phiên học:", error);
        }
      } else {
        // Tạo phiên học mới
        try {
          const docRef = doc(collection(db, "studySessions"));
          const sessionData = {
            sessionId: docRef.id,
            userId,
            date: Timestamp.now(),
            job,
            totalFocusMinutes: initialMinutes,
            actualFocusMinutes: 0,
            remainingMinutes: initialMinutes,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          await setDoc(docRef, sessionData);
          console.log("Document created with ID:", docRef.id, "Data:", sessionData);
          setSessionId(docRef.id);
        } catch (error) {
          console.error("Lỗi khi tạo phiên học:", error);
        }
      }
    };
    handleSession();
  }, []);

  useEffect(() => {
    if (!isRunning || !endTime || !periods[currentIndex]) return; // ✅ THÊM DÒNG NÀY

    const id = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((endTime - now) / 1000));
      setSecondsLeft(diff);

      if (diff <= 0) {
        clearInterval(id);

        // --- Cập nhật Firestore ---
        const updateSession = async () => {
          if (userId && sessionId && periods[currentIndex].type === "focus") {
            try {
              const sessionRef = doc(db, "studySessions", sessionId);
              const newActualFocusMinutes = actualFocusMinutes + periods[currentIndex].minutes;
              const newRemainingMinutes = initialMinutes - newActualFocusMinutes;

              await updateDoc(sessionRef, {
                actualFocusMinutes: newActualFocusMinutes,
                remainingMinutes: newRemainingMinutes >= 0 ? newRemainingMinutes : 0,
                updatedAt: Timestamp.now(),
              });

              setActualFocusMinutes(newActualFocusMinutes);
            } catch (error) {
              console.error("Lỗi khi cập nhật phiên học:", error);
            }
          }
        };
        updateSession();

        // --- Phát âm thanh ---
        if (periods[currentIndex].type === "focus") {
          breakSound.play(); // Hết focus thì nghỉ
        } else {
          focusSound.play(); // Hết break thì học
        }

        if ('Notification' in window && Notification.permission === 'granted') {
          if (currentIndex < periods.length - 1) {
            new Notification(
              periods[currentIndex].type === "focus"
                ? "Đã hết thời gian tập trung! Đến giờ nghỉ rồi."
                : "Đã hết giờ nghỉ! Quay lại tập trung nhé."
            );
          } else {
            new Notification("Chúc mừng bạn đã hoàn thành phiên học! 🎉");
          }
        }
        // --- Chuyển sang period kế ---
        if (currentIndex < periods.length - 1) {
          const nextIndex = currentIndex + 1;
          setCurrentIndex(nextIndex);
          const nextSeconds = periods[nextIndex].minutes * 60;
          setSecondsLeft(nextSeconds);
          setEndTime(Date.now() + nextSeconds * 1000);
        } else {
          setSecondsLeft(0);
          setEndTime(null);
        }
      }
    }, 1000);

    return () => clearInterval(id);
  }, [
    isRunning,
    endTime,
    currentIndex,
    periods,
    userId,
    sessionId,
    actualFocusMinutes,
    initialMinutes,
  ]);


  // Tách thời gian thành các periods
  const splitIntoPeriods = (totalMinutes) => {
    const result = [];
    if (totalMinutes <= 60) {
      result.push({ type: "focus", minutes: totalMinutes });
      return result;
    }

    let remaining = totalMinutes;
    while (remaining > 0) {
      if (remaining > 60) {
        result.push({ type: "focus", minutes: 50 });
        remaining -= 50;

        if (remaining > 0) {
          const breakMin = Math.min(10, remaining);
          result.push({ type: "break", minutes: breakMin });
          remaining -= breakMin;
        }
      } else {
        result.push({ type: "focus", minutes: remaining });
        remaining = 0;
      }
    }
    return result;
  };

  if (periods.length === 0) return <div>No data</div>;

  const current = periods[currentIndex];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Tính % progress trong period hiện tại
  const totalCurrentSec = current.minutes * 60;
  const progressPct =
    totalCurrentSec > 0
      ? (1 - secondsLeft / totalCurrentSec) * 100
      : 100;

  // Tính số lá dựa trên progressPct
  const leafCount = Math.floor(progressPct / 20); // Thêm lá mỗi 20%
  const leaves = [];
  for (let i = 0; i < leafCount; i++) {
    leaves.push(
      <path
        key={i}
        d={`M${50 + (i - 2) * 15} ${65 - i * 5} Q${40 + (i - 2) * 15} ${55 - i * 5} ${30 + (i - 2) * 15} ${65 - i * 5} Q${40 + (i - 2) * 15} ${75 - i * 5} ${50 + (i - 2) * 15} ${65 - i * 5} Z`}
        fill="#228B22"
        opacity={progressPct / 100}
      />
    );
  }

  const handleToggle = () => {
    if (isRunning) {
      // --- Tạm dừng ---
      setIsRunning(false);
      setEndTime(null); // Xóa endTime để dừng bộ đếm
    } else {
      // --- Tiếp tục hoặc bắt đầu mới ---
      const newEnd = Date.now() + secondsLeft * 1000;
      setEndTime(newEnd);
      setIsRunning(true);
    }
  };

  if (!periods.length || !periods[currentIndex]) return <div>Đang khởi tạo...</div>;

  return (
    <div className="con-container">
      <div className="con-card">

        <Snowflakes />
        {/* Header */}
        <div className="con-head">
          <span className="con-dot">◆</span>
          <h2>{current.type === "focus" ? "Focus" : "Break"}</h2>
        </div>

        {/* Job */}
        {job && (
          <p className="con-job">
            Job: <strong>{job}</strong>
          </p>
        )}

        {/* Period info */}
        <p className="con-sub">
          {current.type === "focus"
            ? `Focus period (${currentIndex + 1} of ${periods.length})`
            : `Break period (${currentIndex + 1} of ${periods.length})`}
        </p>
        <div className="con-timer-wrapper">
          {/* Timer hiển thị khác nhau theo viewMode */}
          {viewMode === "circle" && (
            <div className="dial" style={{ "--pct": `${progressPct}%` }}>
              <div className="dial-inner">
                <div className="dial-time">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          )}

          {viewMode === "tree" && (
            <div className="tree-timer" style={{ height: "280px" }}>
              <svg width="180" height="280" viewBox="0 0 100 280">
                {/* Chậu cây */}
                <ellipse cx="50" cy="260" rx="34" ry="14" fill="#6ba4f8" />
                <rect x="16" y="240" width="68" height="20" fill="#6ba4f8" rx="10" />
                {/* Đất */}
                <ellipse cx="50" cy="240" rx="30" ry="9" fill="#5a3623" />

                {/* Thân cây cong & to hơn */}
                <path
                  className="tree-trunk"
                  d="M50 240 
           C48 200, 52 160, 47 120 
           C53 90, 48 70, 50 40"
                  stroke="#2d5a27"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* Lá */}
                {Array.from({ length: 5 }, (_, i) => {
                  const leafProgress = Math.floor(progressPct / 20);
                  const isActive = i < leafProgress;

                  // khoảng cách dọc giữa các lá
                  const step = 40;
                  const y = 200 - i * step;

                  if (i === 4) {
                    // 🌱 Lá trên cùng mọc thẳng trên thân
                    return (
                      <rect
                        key={i}
                        x={50 - 17}
                        y={y - 17}
                        width="34"
                        height="34"
                        rx="4"
                        fill="#22c55e"
                        style={{
                          transformOrigin: `50px ${y}px`,
                          transform: isActive ? "scale(1)" : "scale(0.3)",
                          transition: "transform 0.5s ease",
                        }}
                      />
                    );
                  }

                  // 🌱 Các lá hai bên có nhánh cong dài hơn
                  const side = i % 2 === 0 ? -1 : 1;
                  const offset = 55; // tăng từ 40 lên 55
                  const x = 50 + side * offset;

                  return (
                    <g key={i}>
                      {/* Nhánh cong */}
                      <path
                        className="tree-branch"
                        d={`M50 ${y} Q ${50 + side * 25} ${y - 15}, ${x} ${y}`}
                        stroke="#2d5a27"
                        strokeWidth="4"
                        fill="none"
                      />
                      {/* Lá vuông */}
                      <rect
                        x={x - 17}
                        y={y - 17}
                        width="34"
                        height="34"
                        rx="4"
                        fill="#22c55e"
                        style={{
                          transformOrigin: `${x}px ${y}px`,
                          transform: isActive ? "scale(1)" : "scale(0.3)",
                          transition: "transform 0.5s ease",
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          )}




          {viewMode === "candle" && (
            <div className="candle-timer">
              <div className="candle">
                <div
                  className="flame"
                  style={{ opacity: 1 - progressPct / 100 }}
                ></div>
                <div
                  className="wax"
                  style={{ height: `${100 - progressPct}%` }}
                ></div>
              </div>
              {/* <div className="dial-time">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div> */}
            </div>
          )}
        </div>
        {/* Nút điều khiển + Menu 3 chấm */}
        <div className="con-controls">
          {!(secondsLeft === 0 && currentIndex === periods.length - 1) && (
            <button
              className={`con-btn ${isRunning ? "pause" : "start"}`}
              onClick={handleToggle}
              aria-label={isRunning ? "Pause" : "Start"}
            >
              <span className="con-btn-icon">{isRunning ? "⏸" : "▶"}</span>
            </button>
          )}

          {/* Nút 3 chấm */}
          <div className="menu-wrapper">
            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreVertical size={17} />
            </button>
            {menuOpen && (
              <div className="menu-dropdown">
                {viewMode !== "circle" && (
                  <button onClick={() => {
                    setViewMode("circle");
                    setMenuOpen(false); // đóng dropdown
                  }}>⭕</button>
                )}
                {viewMode !== "tree" && (
                  <button onClick={() => {
                    setViewMode("tree");
                    setMenuOpen(false); // đóng dropdown
                  }}>🌱</button>
                )}
                {viewMode !== "candle" && (
                  <button onClick={() => {
                    setViewMode("candle");
                    setMenuOpen(false); // đóng dropdown
                  }}>🕯️</button>
                )}
              </div>
            )}
          </div>
        </div>


        {/* Status message */}
        <p className="con-next">
          {secondsLeft === 0 && currentIndex === periods.length - 1
            ? "Hoàn thành! Tuyệt vời 👏"
            : isRunning
              ? "Đang tập trung..."
              : "Đang tạm dừng"}
        </p>
        <p className="con-quote">💡 {quote}</p>

        {/* Toggle theme */}
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </div>
  );
}
