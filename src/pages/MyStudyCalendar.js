import React, { useState, useEffect, use, act } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import "../styles/MyStudyCalendar.css";
import { db, auth } from "../firebase";
import { collection, setDoc, query, doc, getDocs, where, Timestamp, deleteDoc } from "firebase/firestore";
import ModalAddCalendar from "../components/ModalAddCalendar";
import ModalUpdateCalendar from "../components/ModalUpdateCalender";


export default function MyStudyCalendar({ events }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalUpdateOpen, setModalUpdateOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        repeat: "none", // none | daily | weekly
        daysOfWeek: [],
        start: "",
        end: "",
    });
    const [calendarApi, setCalendarApi] = useState(null);

    const [sessions, setSessions] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);


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

                // Query 2: tất cả weekly and daily repeat
                const q2 = query(
                    collection(db, "studySessions"),
                    where("userId", "==", auth.currentUser.uid),
                    where("repeat", "in", ["weekly", "daily"])
                );

                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

                let querySnapshot = [...snap1.docs, ...snap2.docs]; // gộp kết quả
                let allEvents = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    if ((data.repeat === "weekly" || data.repeat === "daily") && data.daysOfWeek) {
                        console.log("Xử lý sự kiện lặp:", data.job);
                        // generate các lần lặp trong 30 ngày tới
                        const current = new Date(thirtyDaysAgo);
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
                                console.log("Lặp lại sự kiện:", data.job, "vào", start);
                                allEvents.push({
                                    id: `${doc.id}-${start.getTime()}`,
                                    title: data.job,
                                    start,
                                    end,
                                    extendedProps: {
                                        repeat: data.repeat,
                                        daysOfWeek: data.daysOfWeek,
                                    }
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
                extendedProps: { repeat: "weekly", daysOfWeek: newEvent.daysOfWeek },
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
            const eventDate = new Date(newEvent.start);
            const dayOfWeek = eventDate.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
            // lặp lại hằng ngày
            calendarApi.addEvent({
                title: newEvent.title,
                daysOfWeek: [dayOfWeek],
                startTime: newEvent.start.split("T")[1],
                endTime: newEvent.end.split("T")[1],
                extendedProps: { repeat: "daily", daysOfWeek: [dayOfWeek] },
            });

            try {
                const docRef = doc(collection(db, "studySessions"));
                const sessionData = {
                    sessionId: docRef.id,
                    userId: auth.currentUser.uid,
                    endDate: newEvent.end.split("T")[1],
                    job: newEvent.title,
                    repeat: "daily",
                    daysOfWeek: [dayOfWeek],
                    startDate: newEvent.start.split("T")[1],
                };
                console.log("Session Data to be saved:", sessionData);
                await setDoc(docRef, sessionData);
                console.log("Document created with ID:", docRef.id, "Data:", sessionData);
            } catch (error) {
                console.error("Lỗi khi tạo phiên học:", error);
            }

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

    const handleUpdate = async () => {
        if (!selectedEvent) return;

        try {
            // 2. Update Firestore
            if (newEvent.repeat === "weekly" && (!newEvent.daysOfWeek || newEvent.daysOfWeek.length === 0)) {
                alert("Vui lòng chọn ngày trong tuần cho lịch lặp lại hàng tuần.");
                return;
            }

            if (newEvent.repeat === "weekly") {
                try {
                    selectedEvent.setProp("title", newEvent.title);
                    selectedEvent.setStart(newEvent.start.split("T")[1]);
                    selectedEvent.setEnd(newEvent.end.split("T")[1]);
                    selectedEvent.setExtendedProp("repeat", "weekly");
                    selectedEvent.setExtendedProp("daysOfWeek", newEvent.daysOfWeek);
                    await setDoc(
                        doc(db, "studySessions", selectedEvent.id.split("-")[0]),
                        {
                            job: newEvent.title,
                            startDate: newEvent.start.split("T")[1],
                            endDate: newEvent.end.split("T")[1],
                            repeat: "weekly",
                            daysOfWeek: newEvent.daysOfWeek,
                        },
                        { merge: true }
                    );
                } catch (error) {
                    console.error("Lỗi khi update:", error);
                }

            }
            else if (newEvent.repeat === "daily") {
                const eventDate = new Date(newEvent.start);
                const dayOfWeek = eventDate.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
                try {
                    selectedEvent.setProp("title", newEvent.title);
                    selectedEvent.setStart(newEvent.start.split("T")[1]);
                    selectedEvent.setEnd(newEvent.end.split("T")[1]);
                    selectedEvent.setExtendedProp("repeat", "daily");
                    selectedEvent.setExtendedProp("daysOfWeek", [dayOfWeek]);
                    
                    await setDoc(
                        doc(db, "studySessions", selectedEvent.id.split("-")[0]),
                        {
                            job: newEvent.title,
                            startDate: newEvent.start.split("T")[1],
                            endDate: newEvent.end.split("T")[1],
                            repeat: "daily",
                            daysOfWeek: [dayOfWeek],
                        },
                        { merge: true }
                    );
                } catch (error) {
                    console.error("Lỗi khi update:", error);
                }
            } else {
                const startDate = new Date(newEvent.start);
                const endDate = new Date(newEvent.end);
                const initialMinutes = Math.floor((endDate - startDate) / (1000 * 60)); // số phút phải học

                selectedEvent.setProp("title", newEvent.title);
                selectedEvent.setStart(startDate);
                selectedEvent.setEnd(endDate);

                await setDoc(
                    doc(db, "studySessions", selectedEvent.id.split("-")[0]),
                    {
                        job: newEvent.title,
                        end: new Date(newEvent.end),
                        updatedAt: new Date(),
                        totalFocusMinutes: initialMinutes,
                        remainingMinutes: initialMinutes, // reset lại remaining
                        actualFocusMinutes: 0,
                        createdAt: startDate
                    },
                    { merge: true }
                );
            }

            console.log("Đã update:", selectedEvent.id);
        } catch (error) {
            console.error("Lỗi khi update:", error);
        }

        setModalUpdateOpen(false);
    };

    const handleDelete = async (info) => {
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
        setModalUpdateOpen(false);
    }

    const handleClick = (info) => {
        console.log("Event clicked:", info.event);

        // ✅ lưu lại event đang chọn để truyền sang modal update
        setSelectedEvent(info.event);
        setNewEvent({
            title: info.event.title,
            start: info.event.startStr,
            end: info.event.endStr,
            repeat: info.event.extendedProps.repeat || "none",
            daysOfWeek: info.event.extendedProps.daysOfWeek || [],
        });
        setModalUpdateOpen(true);
    };

    useEffect(() => {
        console.log("sessions updated:", sessions);
    }, [sessions]);
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
                eventClick={handleClick}
            />
            {modalUpdateOpen && (
                <ModalUpdateCalendar
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    handleUpdate={handleUpdate}
                    handleDelete={() => handleDelete({ event: selectedEvent })}
                    setModalUpdateOpen={setModalUpdateOpen}
                />
            )}

            {modalOpen && (
                <ModalAddCalendar
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    handleSave={handleSave}
                    setModalOpen={setModalOpen}
                />
            )}
        </>
    );
}
