import os
import uuid
import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime
from gtts import gTTS
import threading

app = Flask(__name__)
CORS(app)

# Thư mục chứa file âm thanh
AUDIO_FOLDER = "static/audio"
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# Hàm tự động xóa file âm thanh sau 10 phút
def auto_delete_file(path, delay_minutes=10):
    def delete():
        import time
        time.sleep(delay_minutes * 60)
        try:
            if os.path.exists(path):
                os.remove(path)
                print(f"Đã xóa file âm thanh: {path}")
        except Exception as e:
            print(f"Lỗi khi xóa file {path}: {e}")
    threading.Thread(target=delete, daemon=True).start()

@app.route("/chat", methods=["POST"])
def chat_endpoint():
    try:
        body = request.get_json()
        user_message = body.get("message", "").lower().strip()
        print("User Message:", user_message)

        now = datetime.now()

        # Các câu trả lời đặc biệt
        if "mấy giờ" in user_message or "bây giờ là mấy giờ" in user_message:
            reply = f"Bây giờ là {now.strftime('%H:%M:%S')}"
        elif "ngày mấy" in user_message or "hôm nay là ngày mấy" in user_message:
            reply = f"Hôm nay là ngày {now.strftime('%d/%m/%Y')}"
        elif "mở youtube" in user_message:
            return jsonify({"reply": "Đã mở YouTube giúp bạn.", "open_url": "https://www.youtube.com"})
        elif "mở google" in user_message:
            return jsonify({"reply": "Mở Google nè.", "open_url": "https://www.google.com"})
        elif "mở facebook" in user_message:
            return jsonify({"reply": "Đây là Facebook!", "open_url": "https://www.facebook.com"})
        else:
            # Gửi câu hỏi lên OpenRouter (OpenAI GPT-3.5 Turbo)
            headers = {
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "openai/gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Bạn là trợ lý ảo nói tiếng Việt chuẩn, tự nhiên, thân thiện, "
                            "giống người Việt Nam thật sự. Hãy trả lời ngắn gọn, dễ hiểu, "
                            "dùng ngữ pháp chính xác và từ ngữ phổ thông."
                        )
                    },
                    {"role": "user", "content": user_message}
                ]
            }

            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"]

        # Tạo file âm thanh từ câu trả lời
        tts = gTTS(text=reply, lang="vi",tld="com.vn")
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_FOLDER, filename)
        tts.save(filepath)

        # Khởi chạy xóa file sau 10 phút
        auto_delete_file(filepath)

        return jsonify({
            "reply": reply,
            "audio_url": f"/static/audio/{filename}"
        })

    except Exception as e:
        print("Lỗi:", str(e))
        return jsonify({"reply": "Xin lỗi, có lỗi xảy ra", "error": str(e)}), 500

# Endpoint trả file audio .mp3 cho client
@app.route("/static/audio/<filename>")
def serve_audio(filename):
    return send_from_directory(AUDIO_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
