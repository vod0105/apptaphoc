import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, setDoc, updateDoc, doc, getDoc, Timestamp } from "firebase/firestore";
import "../styles/Concentrate.css";

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

  // Timer countdown và cập nhật thời gian học
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // Cập nhật Firestore khi focus period hoàn thành
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

          // Chuyển sang period tiếp theo
          if (currentIndex < periods.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setSecondsLeft(periods[nextIndex].minutes * 60);
            return periods[nextIndex].minutes * 60;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, secondsLeft, currentIndex, periods, userId, sessionId, actualFocusMinutes, initialMinutes]);

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
  return (
    <div className="con-container">
      <div className="con-card">
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

        {/* Timer dial */}
        <div className="dial" style={{ "--pct": `${progressPct}%` }}>
          <div className="dial-inner">
            <div className="dial-time">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Start/Pause button */}
        <button
          className={`con-btn ${isRunning ? "pause" : "start"}`}
          onClick={() => setIsRunning((v) => !v)}
          aria-label={isRunning ? "Pause" : "Start"}
        >
          <span className="con-btn-icon">{isRunning ? "⏸" : "▶"}</span>
          {isRunning ? "Pause" : "Start"}
        </button>

        {/* Status message */}
        <p className="con-next">
          {secondsLeft === 0 && currentIndex === periods.length - 1
            ? "Hoàn thành! Tuyệt vời 👏"
            : isRunning
              ? "Đang tập trung..."
              : "Đang tạm dừng"}
        </p>
        <p className="con-quote">💡 {quote}</p>
      </div>
    </div>
  );
}
