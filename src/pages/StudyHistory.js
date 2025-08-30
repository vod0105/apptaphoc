import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    BarChart,
    Bar,
} from "recharts";
import { format } from "date-fns";
import "../styles/StudyHistory.css";

function StudyHistory() {
    const navigate = useNavigate();


    const [sessions, setSessions] = useState([]);
    const [dailyData, setDailyData] = useState([]);
    const [jobData, setJobData] = useState([]);

    useEffect(() => {
        const fetchSessions = async () => {
            if (auth.currentUser) {
                const now = new Date();

                // lấy hôm nay
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

                // lấy 10 ngày gần nhất
                const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

                const q = query(
                    collection(db, "studySessions"),
                    where("userId", "==", auth.currentUser.uid),
                    where("createdAt", ">=", Timestamp.fromDate(tenDaysAgo))
                );

                const querySnapshot = await getDocs(q);
                const sessionList = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // --- 1. Phiên học hôm nay ---
                setSessions(
                    sessionList.filter(
                        (s) =>
                            s.createdAt.toDate() >= startOfToday &&
                            s.createdAt.toDate() <= endOfToday
                    )
                );

                // --- 2. Biểu đồ 10 ngày gần nhất (gộp theo ngày) ---
                const groupedDays = {};
                sessionList.forEach((s) => {
                    const dayKey = format(s.createdAt.toDate(), "yyyy-MM-dd");
                    if (!groupedDays[dayKey]) {
                        groupedDays[dayKey] = { total: 0, actual: 0 };
                    }
                    groupedDays[dayKey].total += s.totalFocusMinutes || 0;
                    groupedDays[dayKey].actual += s.actualFocusMinutes || 0;
                });

                const days = [];
                for (let i = 9; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = format(d, "yyyy-MM-dd");
                    const total = groupedDays[key]?.total || 0;
                    const actual = groupedDays[key]?.actual || 0;
                    days.push({
                        date: format(d, "d/M"),
                        actual,
                        remaining: Math.max(total - actual, 0),
                    });
                }
                setDailyData(days);

                // --- 3. Biểu đồ theo môn học (gộp 10 ngày) ---
                const groupedJobs = {};
                sessionList.forEach((s) => {
                    if (!groupedJobs[s.job]) {
                        groupedJobs[s.job] = { total: 0, actual: 0 };
                    }
                    groupedJobs[s.job].total += s.totalFocusMinutes || 0;
                    groupedJobs[s.job].actual += s.actualFocusMinutes || 0;
                });

                const jobs = Object.keys(groupedJobs).map((job) => ({
                    job,
                    total: groupedJobs[job].total,
                    actual: groupedJobs[job].actual,
                }));
                setJobData(jobs);
            }
        };
        fetchSessions();
    }, []);

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

    return (
        <div className="history-container">
            <h1 className="main-title">📖 Lịch sử học tập</h1>

            {/* --- 1. Danh sách phiên học hôm nay --- */}
            <h2 className="chart-title">📌 Phiên học hôm nay</h2>

            <div className="session-list">
                {sessions.length > 0 ? (
                    sessions.map((session) => {
                        const percent = Math.min(
                            Math.round((session.actualFocusMinutes / session.totalFocusMinutes) * 100),
                            100
                        );
                        return (
                            <div key={session.id} className="session-card">
                                <h3 className="session-job">📘 {session.job}</h3>
                                <p>📅 {session.createdAt.toDate().toLocaleString()}</p>
                                <p>🎯 Mục tiêu: {session.totalFocusMinutes} phút</p>
                                <p>✅ Thực tế: {session.actualFocusMinutes} phút</p>
                                <p>⏳ Còn thiếu: {session.remainingMinutes} phút</p>
                                {/* progress bar */}

                                <div className="progress-container">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${percent}%` }}
                                        >
                                            {percent}%
                                        </div>
                                    </div>
                                    {percent < 100 && (
                                        <button className="continue-btn" onClick={() => handleContinue(session)}>Học tiếp</button>
                                    )}
                                </div>

                            </div>
                        );
                    })
                ) : (
                    <p>Chưa có phiên học nào hôm nay.</p>
                )}
            </div>

            {/* --- 2. Biểu đồ 10 ngày gần nhất --- */}
            <h2 className="chart-title">📊 Thời gian học trong 10 ngày gần nhất</h2>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyData}>
                        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="actual" stroke="#82ca9d" name="Thực tế" />
                        <Line type="monotone" dataKey="remaining" stroke="#ff6b6b" name="Còn thiếu" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* --- 3. Biểu đồ theo môn học --- */}
            <h2 className="chart-title">📌 So sánh theo môn học (10 ngày gần nhất)</h2>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={jobData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="job" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="#8884d8" name="Mục tiêu" />
                        <Bar dataKey="actual" fill="#82ca9d" name="Thực tế" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default StudyHistory;
