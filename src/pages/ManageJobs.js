import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/ManageJobs.css";

export default function ManageJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [newJob, setNewJob] = useState("");

    const user = auth.currentUser;

    useEffect(() => {
        const fetchJobs = async () => {
            if (!user) return;
            const q = query(collection(db, "jobs"), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);
            setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchJobs();
    }, [user]);

    const handleAddJob = async () => {
        if (!newJob.trim() || !user) return;
        const docRef = await addDoc(collection(db, "jobs"), {
            name: newJob,
            userId: user.uid,
        });
        setJobs([...jobs, { id: docRef.id, name: newJob, userId: user.uid }]);
        setNewJob("");
    };

    const handleDeleteJob = async (id) => {
        await deleteDoc(doc(db, "jobs", id));
        setJobs(jobs.filter(job => job.id !== id));
    };

    return (
        <div className="manage-jobs">
            <h2>⚙️ Quản lý công việc</h2>

            <input
                type="text"
                placeholder="Tên công việc mới..."
                value={newJob}
                onChange={(e) => setNewJob(e.target.value)}
            />
            <button onClick={handleAddJob}>+ Thêm</button>

            <ul>
                {jobs.map((job) => (
                    <li key={job.id}>
                        {job.name}
                        <button onClick={() => handleDeleteJob(job.id)}>❌ Xoá</button>
                    </li>
                ))}
            </ul>

            <button onClick={() => navigate("/")}>⬅ Quay lại</button>
        </div>
    );
}
