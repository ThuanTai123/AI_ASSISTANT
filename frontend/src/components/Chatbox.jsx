import React, { useState, useRef, useEffect } from "react";

export default function Chatbox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Chào bạn! Bạn muốn hỏi gì?" },
  ]);
  const [loading, setLoading] = useState(false);
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

    try {
      const res = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
      speak(data.reply);

      if (data.open_url) {
        window.open(data.open_url, '_blank');
      }

    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: "Xin lỗi, có lỗi xảy ra." }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
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
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "auto",
        padding: 20,
        border: "1px solid #ccc",
        borderRadius: 8,
        position: "relative",
      }}
    >
      {/* Nút xem lịch sử */}
      {!showHistory && (
        <button
          onClick={() => setShowHistory(true)}
          style={{
            marginBottom: 12,
            padding: "8px 16px",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 6,
          }}
        >
          Xem lịch sử
        </button>
      )}

      {/* Popup xem lịch sử */}
      {showHistory && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: 16,
            overflowY: "auto",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Lịch sử trò chuyện</h3>
          <label>
            Chọn ngày:{" "}
            <input
              type="date"
              value={historyDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setHistoryDate(e.target.value)}
            />
          </label>

          <div
            style={{
              flexGrow: 1,
              marginTop: 12,
              maxHeight: 300,
              overflowY: "auto",
              background: "#f9f9f9",
              padding: 10,
              borderRadius: 6,
            }}
          >
            {historyMessages.length === 0 && (
              <p>Không có lịch sử trò chuyện cho ngày này.</p>
            )}
            {historyMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  textAlign: msg.sender === "user" ? "right" : "left",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 12,
                    background: msg.sender === "user" ? "#007bff" : "#e5e5ea",
                    color: msg.sender === "user" ? "#fff" : "#000",
                    fontSize: 14,
                  }}
                >
                  {msg.text}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowHistory(false)}
            style={{
              marginTop: 12,
              padding: "6px 12px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              alignSelf: "flex-end",
            }}
          >
            Quay lại chat
          </button>
        </div>
      )}

      {/* Giao diện chat chính (ẩn khi xem lịch sử) */}
      {!showHistory && (
        <>
          <div
            style={{
              minHeight: 300,
              maxHeight: 400,
              overflowY: "auto",
              marginBottom: 10,
              padding: 10,
              background: "#f9f9f9",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  textAlign: msg.sender === "user" ? "right" : "left",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: 16,
                    background: msg.sender === "user" ? "#007bff" : "#e5e5ea",
                    color: msg.sender === "user" ? "#fff" : "#000",
                  }}
                >
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              placeholder="Nhập tin nhắn..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={loading}
              style={{ flexGrow: 1, padding: 8, fontSize: 16 }}
            />
            <button onClick={handleSend} disabled={loading}>
              Gửi
            </button>
            <button
              className={`px-4 py-2 rounded ${
                listening ? "bg-red-500" : "bg-green-500"
              } text-white`}
              onClick={handleMicClick}
            >
              🎤
            </button>
          </div>

          {pendingUrl && (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <button
                onClick={() => {
                  window.open(pendingUrl, "_blank");
                  setPendingUrl(null);
                }}
                style={{
                  background: "#dc3545",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                👉 Mở liên kết
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
