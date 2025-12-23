import React, { useState, useEffect } from 'react';

export default function AssistantTools() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);

  const [task, setTask] = useState("");
  const [remindTime, setRemindTime] = useState("");
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [appointments, setAppointments] = useState([]);

  const API = "http://localhost:5000";

  // Fetch dữ liệu khi load
  useEffect(() => {
    fetch(`${API}/note`).then(res => res.json()).then(setNotes);
    fetch(`${API}/task`).then(res => res.json()).then(setTasks);
    fetch(`${API}/appointment`).then(res => res.json()).then(setAppointments);
  }, []);

  // Submit ghi chú
  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
    const data = await res.json();
    setNotes([...notes, data]);
    setNote("");
  };

  // Submit nhắc việc
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, remind_time: remindTime }),
    });
    const data = await res.json();
    setTasks([...tasks, data]);
    setTask("");
    setRemindTime("");
  };

  // Submit lịch hẹn
  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, time, location }),
    });
    const data = await res.json();
    setAppointments([...appointments, data]);
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📝 Ghi chú</h2>
      <form onSubmit={handleNoteSubmit}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập ghi chú..." />
        <button type="submit">Lưu</button>
      </form>
      <ul>
        {notes.map(n => <li key={n.id}>{n.content}</li>)}
      </ul>

      <hr />

      <h2>⏰ Nhắc việc</h2>
      <form onSubmit={handleTaskSubmit}>
        <input value={task} onChange={e => setTask(e.target.value)} placeholder="Công việc..." />
        <input type="datetime-local" value={remindTime} onChange={e => setRemindTime(e.target.value)} />
        <button type="submit">Lưu</button>
      </form>
      <ul>
        {tasks.map(t => (
          <li key={t.id}>
            {t.task} - Nhắc lúc {new Date(t.remind_time).toLocaleString()}
          </li>
        ))}
      </ul>

      <hr />

      <h2>📅 Lịch hẹn</h2>
      <form onSubmit={handleAppointmentSubmit}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề..." />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Địa điểm..." />
        <button type="submit">Tạo lịch hẹn</button>
      </form>
      <ul>
        {appointments.map(a => (
          <li key={a.id}>
            {a.title} - {a.date} {a.time} tại {a.location}
          </li>
        ))}
      </ul>
    </div>
  );
}
