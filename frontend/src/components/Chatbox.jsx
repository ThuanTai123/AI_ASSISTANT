import React, { useState, useRef, useEffect } from "react";
import AssistantTools from './AssistantTools';


export default function Chatbox() {
  const [activeReminder, setActiveReminder] = useState(null); // nhắc nhở đang được hiển thị như báo thức

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Chào bạn! Bạn muốn hỏi gì?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [reminders, setReminders] = useState([]);
  const messageEndRef = useRef(null);
  const [userMessage, setUserMessage] = useState('');
  const [listening, setListening] = useState(false);
  const [pendingUrl, setPendingUrl] = useState(null);

  // Thêm trạng thái popup xem lịch sử
  const [showHistory, setShowHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyMessages, setHistoryMessages] = useState([]);

  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechRecognizer = recognition ? new recognition() : null;

  // Hàm lấy key localStorage theo ngày
  const getStorageKey = (date) => `chat_history_${date}`;

  const markReminderAsNotified = async (id) => {
    try {
      await fetch(`http://localhost:5000/appointment/${id}/notified`, {
        method: 'POST'
      });
    } catch (err) {
      console.error("Lỗi khi đánh dấu đã thông báo:", err);
    }
  };


  // Load lịch sử khi thay đổi ngày trong popup
  useEffect(() => {
    if (showHistory) {
      const saved = localStorage.getItem(getStorageKey(historyDate));
      if (saved) {
        setHistoryMessages(JSON.parse(saved));
      } else {
        setHistoryMessages([]);
      }
    }
  }, [historyDate, showHistory]);

  // Lưu lịch sử chat vào localStorage khi messages thay đổi (chỉ khi không xem lịch sử)
  useEffect(() => {
    if (!showHistory) {
      localStorage.setItem(getStorageKey(new Date().toISOString().slice(0, 10)), JSON.stringify(messages));
    }
  }, [messages, showHistory]);
   useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Định kỳ gọi API /appointment lấy nhắc nhở mỗi 30s
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await fetch("http://localhost:5000/appointment");
        if (!res.ok) throw new Error("Lỗi khi lấy nhắc nhở");
        const data = await res.json();

        // Lọc các nhắc nhở chưa thông báo (backend nên có flag 'notified' nếu có)
        const newReminders = data.filter((r) => !r.notified);

        if (newReminders.length > 0) {
          setReminders(newReminders);

          newReminders.forEach((r) => {
            if (Notification.permission === "granted") {
              setActiveReminder(newReminders[0]);
            }
          });
        }
      } catch (error) {
        console.error("Lỗi lấy nhắc nhở:", error);
      }
    };

    // Lấy nhắc nhở ngay khi mount
    fetchReminders();

    // Đặt interval 30s
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMicClick = () => {
    if (!speechRecognizer) {
      alert('Trình duyệt không hỗ trợ Speech Recognition');
      return;
    }

    speechRecognizer.lang = 'vi-VN';
    speechRecognizer.interimResults = false;
    speechRecognizer.maxAlternatives = 1;

    speechRecognizer.start();
    setListening(true);

    speechRecognizer.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserMessage(transcript);
      sendMessage(transcript);
      setListening(false);
    };

    speechRecognizer.onerror = () => {
      setListening(false);
    };
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    synth.speak(utterance);
  };

  const sendMessage = async (message) => {
    setMessages((prev) => [...prev, { sender: 'user', text: message }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
      if (data.audio_url) {
        const audio = new Audio("http://localhost:5000" + data.audio_url + `?v=${Date.now()}`);
        audio.play();
      }

      if (data.open_url) {
        window.open(data.open_url, '_blank');
      }

    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: "Xin lỗi, có lỗi xảy ra." }]);
    } finally {
      setLoading(false);
    }
  };

const handleSend = async () => {
  if (!input.trim()) return;

  const userMessage = input;
  setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
  setInput('');

  // Ghi chú
  if (userMessage.toLowerCase().startsWith("ghi chú:")) {
    const content = userMessage.split(":")[1]?.trim();
    if (content) {
      await fetch("http://localhost:5000/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      setMessages(prev => [...prev, { sender: "bot", text: "✅ Đã lưu ghi chú." }]);
    }
    return;
  }
 
if (userMessage.toLowerCase().startsWith("nhắc tôi")) {
  const regex = /nhắc tôi (.+) vào (\d{1,2}:\d{2}) ngày (\d{1,2}\/\d{1,2}\/\d{4})/i;
  const match = userMessage.match(regex);
  if (match) {
    const task = match[1].trim();
    const remind_time = `${match[2]} ${match[3]}`;
    await fetch("http://localhost:5000/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, remind_time })
    });
    setMessages(prev => [...prev, { role: "assistant", content: "✅ Đã lưu nhắc việc." }]);
    return;
  }
}


  // Nhắc việc
  if (userMessage.toLowerCase().startsWith("nhắc việc:")) {
    const parts = userMessage.split(":")[1]?.trim().split("lúc");
    if (parts.length === 2) {
      const task = parts[0].trim();
      const remind_time = parts[1].trim();
      await fetch("http://localhost:5000/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, remind_time })
      });
      setMessages(prev => [...prev, { sender: "bot", text: "✅ Đã lưu nhắc việc." }]);
    }
    return;
  }

  // Tạo lịch hẹn
  if (userMessage.toLowerCase().startsWith("tạo lịch hẹn:")) {
    const regex = /tạo lịch hẹn:\s*(.*?)\s*vào\s*(\d{1,2}:\d{2})\s*ngày\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*tại\s*(.+)/i;
    const match = userMessage.match(regex);
    if (match) {
      const [_, title, time, date, location] = match;
      await fetch("http://localhost:5000/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, time, date, location })
      });
      setMessages(prev => [...prev, { sender: "bot", text: "✅ Đã tạo lịch hẹn." }]);
    }
    return;
  }

  // Mặc định gửi qua /chat
  try {
    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });
    const data = await response.json();
    setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);

    if (data.audio_url) {
      const audio = new Audio(`http://localhost:5000${data.audio_url}`);
      audio.play();
    }
  } catch (err) {
    console.error(err);
    setMessages(prev => [...prev, { sender: 'bot', text: 'Có lỗi xảy ra khi gửi tin nhắn.' }]);
  }
};


  const openYoutube = async () => {
    try {
      const response = await fetch("http://localhost:5000/open-youtube", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Lỗi khi gửi lệnh mở YouTube");
      alert("Đã gửi lệnh mở YouTube!");
    } catch (err) {
      alert("Không thể mở YouTube: " + err.message);
    }
  };

 useEffect(() => {
  if (activeReminder) {
    // Phát tiếng chuông
    const audio = new Audio('/sound/telephone-electronic-42654.mp3');
    audio.play().catch(err => console.error("Không thể phát chuông:", err));
  }
}, [activeReminder]);



  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '400px',
    margin: '0 auto',
    backgroundColor: 'white',
    fontFamily: 'Inter, sans-serif'
  }}>
    {/* Header */}
    <div style={{
      backgroundColor: '#40E0E0',
      padding: '16px',
      textAlign: 'center',
      fontWeight: 'bold',
      color: 'black',
      fontSize: '18px'
    }}>
      AI ASSISTANT
    </div>

    {/* Chat area */}
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 16,
      position: 'relative',
      backgroundColor: '#f9f9f9'
    }}>
      {/* Center divider line */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        borderLeft: '2px dashed #40E0E0',
        marginLeft: '-1px'
      }}></div>
 
      {/* Messages */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex',
            marginBottom: 16,
            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
          }}>
            <span style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 20,
              background: "#40E0E0",
              color: "black",
              maxWidth: '80%',
              wordWrap: 'break-word'
            }}>
              {msg.text}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 16
          }}>
            <span style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: 20,
              background: "#40E0E0",
              color: "black"
            }}>
              Đang trả lời...
            </span>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
    </div>

    {/* Input area */}
    <div style={{
      borderTop: '1px solid #e0e0e0',
      padding: 8,
      backgroundColor: 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Nhập..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 20,
            fontSize: 16,
            outline: 'none'
          }}
        />
        <button 
          onClick={handleSend} 
          disabled={loading || !input.trim()}
          style={{
            marginLeft: 8,
            padding: 8,
            backgroundColor: 'black',
            border: 'none',
            borderRadius: '50%',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 18
          }}
        >
          ➤
        </button>
      </div>

      {/* Bottom controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8
      }}>
        <button style={{
          padding: 8,
          backgroundColor: 'black',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18
        }}>
          ☰
        </button>
        
        <button style={{
          padding: 8,
          backgroundColor: 'black',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18
        }}>
          ☰
        </button>
        
        <button 
          onClick={handleMicClick}
          style={{
            padding: 8,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: listening ? '#ff4444' : 'black'
          }}
        >
          🎤
        </button>
        
        <button style={{
          padding: 8,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18
        }}>
          ❓
        </button>
      </div>
    </div>
        {activeReminder && (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: 24,
      borderRadius: 16,
      textAlign: 'center',
      maxWidth: 300,
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      animation: 'pulse 1s infinite'
    }}>
      <h3 style={{ marginBottom: 12, color: "black"}}>🔔 Nhắc nhở</h3>
      <p><strong style={{color: 'blue'}}>{activeReminder.description}</strong></p>
      <p style={{ fontSize: 14, color: '#555' }}>⏰ {activeReminder.datetime}</p>
      <button
        onClick={() => {
          setActiveReminder(null);
          markReminderAsNotified(activeReminder.id);
        }}
        style={{
          marginTop: 16,
          padding: '8px 16px',
          backgroundColor: '#40E0E0',
          color: 'black',
          border: 'none',
          borderRadius: 20,
          cursor: 'pointer',
          fontWeight: 500
        }}
      >
        Tắt thông báo
      </button>
    </div>
  </div>
)}

    {/* Pending URL button */}
    {pendingUrl && (
      <div style={{ 
        padding: 16, 
        textAlign: "center",
        backgroundColor: '#f0f0f0'
      }}>
        <button
          onClick={() => {
            window.open(pendingUrl, "_blank");
            setPendingUrl(null);
          }}
          style={{
            background: "#40E0E0",
            color: "black",
            padding: "8px 16px",
            borderRadius: 20,
            border: 'none',
            cursor: "pointer",
            fontWeight: '500'
          }}
        >
          👉 Mở liên kết
        </button>
      </div>
    )}
  </div>
);

}