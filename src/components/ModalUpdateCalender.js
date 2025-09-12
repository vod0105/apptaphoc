// ModalAddCalendar.js
import React from "react";

export default function ModalUpdateCalendar({
    newEvent,
    setNewEvent,
    handleUpdate,
    handleDelete,
    setModalUpdateOpen
}) {
    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Thêm sự kiện</h3>
                <label>
                    Tên sự kiện:
                    <input
                        type="text"
                        placeholder="Tên"
                        value={newEvent.title}
                        onChange={(e) =>
                            setNewEvent({ ...newEvent, title: e.target.value })
                        }
                    />
                </label>

                <label>
                    Bắt đầu:
                    <input
                        type="datetime"
                        value={newEvent.start}
                        onChange={(e) =>
                            setNewEvent({ ...newEvent, start: e.target.value })
                        }
                    />
                </label>

                <label>
                    Kết thúc:
                    <input
                        type="datetime"
                        value={newEvent.end}
                        onChange={(e) =>
                            setNewEvent({ ...newEvent, end: e.target.value })
                        }
                    />
                </label>

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
                        Chọn:
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
                    <button onClick={handleUpdate}>Update Event</button>
                    <button onClick={handleDelete}>Delete Event</button>
                    <button onClick={() => setModalUpdateOpen(false)}>Hủy</button>
                </div>
            </div>
        </div>
    );
}
