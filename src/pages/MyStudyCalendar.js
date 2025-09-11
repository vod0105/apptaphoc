import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "../styles/MyStudyCalendar.css";
import { db, auth } from "../firebase";
import { collection, setDoc, query, doc, getDocs, where, Timestamp, deleteDoc } from "firebase/firestore";



export default function MyStudyCalendar({ events }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        repeat: "none", // none | daily | weekly
        daysOfWeek: [],
        start: "",
        end: "",
    });
    const [calendarApi, setCalendarApi] = useState(null);

    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        const fetchSessions = async () => {
            if (auth.currentUser) {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                const q1 = query(
                    collection(db, "studySessions"),
                    where("userId", "==", auth.currentUser.uid),
                    where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
                );

                // Query 2: tất cả weekly repeat
                const q2 = query(
                    collection(db, "studySessions"),
                    where("userId", "==", auth.currentUser.uid),
                    where("repeat", "==", "weekly")
                );

                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

                let querySnapshot = [...snap1.docs, ...snap2.docs]; // gộp kết quả
                let allEvents = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    if (data.repeat === "weekly" && data.daysOfWeek) {
                        // generate các lần lặp trong 30 ngày tới
                        const current = new Date(thirtyDaysAgo);
                        console.log("day: ", data);
                        while (current <= thirtyDaysLater) {
                            if (data.daysOfWeek.includes(current.getDay())) {
                                // start
                                const [h1, m1] = data.startDate.split(":");
                                const start = new Date(current);
                                start.setHours(Number(h1), Number(m1), 0, 0);

                                // end
                                const [h2, m2] = data.endDate.split(":");
                                const end = new Date(current);
                                end.setHours(Number(h2), Number(m2), 0, 0);

                                allEvents.push({
                                    id: `${doc.id}-${start.getTime()}`,
                                    title: data.job,
                                    start,
                                    end,
                                });
                            }

                            current.setDate(current.getDate() + 1);
                        }
                    } else {
                        // sự kiện một lần
                        const start = data.createdAt.toDate();
                        const end = new Date(start.getTime() + data.totalFocusMinutes * 60 * 1000);

                        const isAllDaySelection = data.totalFocusMinutes % (24 * 60) === 0;
                        if (isAllDaySelection) {
                            allEvents.push({
                                id: doc.id,
                                title: data.job,
                                start,
                                end,
                                allDay: isAllDaySelection,
                            });
                        }
                        else {
                            allEvents.push({
                                id: doc.id,
                                title: data.job,
                                start,
                                end,
                            });
                        }

                    }
                });

                setSessions(allEvents);
            }
        };

        fetchSessions();
    }, []);

    useEffect(() => {
        console.log("Sessions updated:", sessions);
    }, [sessions]);

    const handleSelect = (info) => {
        setCalendarApi(info.view.calendar);
        setNewEvent({
            title: "",
            repeat: "none",
            daysOfWeek: [],
            start: info.startStr,
            end: info.endStr,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!newEvent.title) return;
        if (!auth.currentUser) return;
        if (newEvent.repeat === "weekly") {
            // lặp lại theo ngày trong tuần
            calendarApi.addEvent({
                title: newEvent.title,
                daysOfWeek: newEvent.daysOfWeek, // mảng số [1,3,5]
                startTime: newEvent.start.split("T")[1],
                endTime: newEvent.end.split("T")[1],
            });
            try {
                const docRef = doc(collection(db, "studySessions"));
                const sessionData = {
                    sessionId: docRef.id,
                    userId: auth.currentUser.uid,
                    endDate: newEvent.end.split("T")[1],
                    job: newEvent.title,
                    repeat: "weekly",
                    daysOfWeek: newEvent.daysOfWeek,
                    startDate: newEvent.start.split("T")[1],
                };
                console.log("Session Data to be saved:", sessionData);
                await setDoc(docRef, sessionData);
                console.log("Document created with ID:", docRef.id, "Data:", sessionData);
            } catch (error) {
                console.error("Lỗi khi tạo phiên học:", error);
            }

        } else if (newEvent.repeat === "daily") {
            // lặp lại hằng ngày
            calendarApi.addEvent({
                title: newEvent.title,
                startRecur: newEvent.start,
                endRecur: newEvent.end,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: newEvent.start.split("T")[1],
                endTime: newEvent.end.split("T")[1],
            });
        } else {
            const startDate = new Date(newEvent.start);
            const endDate = new Date(newEvent.end);
            const initialMinutes = Math.floor((endDate - startDate) / (1000 * 60)); // số phút phải học
            // sự kiện một lần
            calendarApi.addEvent({
                title: newEvent.title,
                start: newEvent.start,
                end: newEvent.end,
            });
            try {

                const docRef = doc(collection(db, "studySessions"));
                const sessionData = {
                    sessionId: docRef.id,
                    userId: auth.currentUser.uid,
                    end: endDate,
                    job: newEvent.title,
                    totalFocusMinutes: initialMinutes,
                    actualFocusMinutes: 0,
                    remainingMinutes: initialMinutes,
                    createdAt: startDate,
                    updatedAt: startDate,
                };
                console.log("Session Data to be saved:", sessionData);
                await setDoc(docRef, sessionData);
                console.log("Document created with ID:", docRef.id, "Data:", sessionData);
            } catch (error) {
                console.error("Lỗi khi tạo phiên học:", error);
            }

        }

        setModalOpen(false);
    };

    const handleDelete = async (info) => {
        const confirmDelete = window.confirm(`Xóa sự kiện '${info.event.title}'?`);
        if (confirmDelete) {
            try {
                // 1. Xóa trên Firestore (nếu có id)
                if (info.event.id) {
                    await deleteDoc(doc(db, "studySessions", info.event.id.split("-")[0]));
                }

                // 2. Xóa khỏi calendar UI
                info.event.remove();

                // 3. Cập nhật state sessions
                setSessions((prev) =>
                    prev.filter((ev) => ev.id !== info.event.id)
                );

                console.log("Đã xóa:", info.event.id);
            } catch (error) {
                console.error("Lỗi khi xóa:", error);
            }
        }
    }

    return (
        <>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                selectable={true}
                select={handleSelect}
                events={sessions}
                eventClick={handleDelete}
            />

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Thêm sự kiện</h3>
                        <input
                            type="text"
                            placeholder="Tên sự kiện"
                            value={newEvent.title}
                            onChange={(e) =>
                                setNewEvent({ ...newEvent, title: e.target.value })
                            }
                        />

                        <label>
                            Kiểu lặp:
                            <select
                                value={newEvent.repeat}
                                onChange={(e) =>
                                    setNewEvent({ ...newEvent, repeat: e.target.value })
                                }
                            >
                                <option value="none">Không lặp</option>
                                <option value="daily">Hằng ngày</option>
                                <option value="weekly">Hằng tuần</option>
                            </select>
                        </label>

                        {newEvent.repeat === "weekly" && (
                            <div className="days-of-week">
                                Chọn thứ:
                                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                                    <label key={d}>
                                        <input
                                            type="checkbox"
                                            checked={newEvent.daysOfWeek.includes(d)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setNewEvent({
                                                        ...newEvent,
                                                        daysOfWeek: [...newEvent.daysOfWeek, d],
                                                    });
                                                } else {
                                                    setNewEvent({
                                                        ...newEvent,
                                                        daysOfWeek: newEvent.daysOfWeek.filter(
                                                            (day) => day !== d
                                                        ),
                                                    });
                                                }
                                            }}
                                        />
                                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d]}
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className="modal-buttons">
                            <button onClick={handleSave}>Lưu</button>
                            <button onClick={() => setModalOpen(false)}>Hủy</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
