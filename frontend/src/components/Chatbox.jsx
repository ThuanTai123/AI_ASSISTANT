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

      {/* History Button */}
      {!showHistory && (
        <div style={{ padding: '8px 16px', backgroundColor: '#f5f5f5' }}>
          <button
            onClick={() => setShowHistory(true)}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              backgroundColor: "#40E0E0",
              color: "black",
              border: "none",
              borderRadius: 20,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📅 Xem lịch sử
          </button>
        </div>
      )}

      {/* Popup xem lịch sử */}
      {showHistory && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "white",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#40E0E0',
            padding: '16px',
            textAlign: 'center',
            fontWeight: 'bold',
            color: 'black',
            fontSize: '18px',
            margin: '-16px -16px 16px -16px'
          }}>
            Lịch sử trò chuyện
          </div>
          
          <label style={{ marginBottom: '12px', fontSize: '14px' }}>
            Chọn ngày:{" "}
            <input
              type="date"
              value={historyDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setHistoryDate(e.target.value)}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>

          <div style={{
            flexGrow: 1,
            overflowY: "auto",
            background: "#f9f9f9",
            padding: 16,
            borderRadius: 8,
            position: 'relative'
          }}>
            {/* Center divider line for history */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              borderLeft: '2px dashed #40E0E0',
              marginLeft: '-1px'
            }}></div>

            {historyMessages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#666' }}>Không có lịch sử trò chuyện cho ngày này.</p>
            )}
            {historyMessages.map((msg, i) => (
              <div key={i} style={{
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
                  fontSize: 14,
                  maxWidth: '80%'
                }}>
                  {msg.text}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowHistory(false)}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              backgroundColor: "#40E0E0",
              color: "black",
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
              alignSelf: "center",
              fontWeight: '500'
            }}
          >
            ← Quay lại chat
          </button>
        </div>
      )}

      {/* Chat area */}
      {!showHistory && (
        <>
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
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18
              }}>
                ☰
              </button>
              
              <div style={{
                backgroundColor: '#40E0E0',
                color: 'black',
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: '500'
              }}>
                402 × 53
              </div>
              
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
        </>
      )}
    </div>
  );
}