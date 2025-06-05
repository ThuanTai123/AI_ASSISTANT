import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# API lấy thông tin cuộc gọi (giữ nguyên)
@app.route("/call-details", methods=["GET"])
def get_call_details():
    call_id = request.args.get("call_id")
    if not call_id:
        return jsonify({"error": "Call ID is required"}), 400

    try:
        url = f"https://api.vapi.ai/call/{call_id}"
        headers = {
            "Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        summary = data.get("summary")
        analysis = data.get("analysis")
        return jsonify({"summary": summary, "analysis": analysis})
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

# API chat với AI và trả lời thời gian nếu cần
@app.route("/chat", methods=["POST"])
def chat_endpoint():
    try:
        body = request.get_json()
        user_message = body.get("message", "").lower().strip()
        print("User Message:", user_message)

        now = datetime.now()

        # Trả lời câu hỏi về thời gian / ngày
        if "mấy giờ" in user_message or "bây giờ là mấy giờ" in user_message:
            return jsonify({"reply": f"Bây giờ là {now.strftime('%H:%M:%S')}"})

        if "ngày mấy" in user_message or "hôm nay là ngày mấy" in user_message:
            return jsonify({"reply": f"Hôm nay là ngày {now.strftime('%d/%m/%Y')}"})

        # Lệnh mở URL đặc biệt
        if "mở youtube" in user_message:
            return jsonify({"reply": "Đã mở YouTube giúp bạn.", "open_url": "https://www.youtube.com"})
        if "mở google" in user_message:
            return jsonify({"reply": "Mở Google nè.", "open_url": "https://www.google.com"})
        if "mở facebook" in user_message:
            return jsonify({"reply": "Đây là Facebook!", "open_url": "https://www.facebook.com"})

        # Gửi câu hỏi lên OpenRouter
        headers = {
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "openai/gpt-3.5-turbo",
            "messages": [{"role": "user", "content": user_message}]
        }

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        data = response.json()
        reply = data["choices"][0]["message"]["content"]

        return jsonify({"reply": reply})

    except Exception as e:
        print("Lỗi:", str(e))
        return jsonify({"reply": "Xin lỗi, có lỗi xảy ra", "error": str(e)}), 500

# API mở YouTube (nếu dùng lệnh mở từ frontend gọi riêng)
@app.route("/open-youtube", methods=["POST"])
def open_youtube():
    try:
        import webbrowser
        webbrowser.open("https://www.youtube.com")
        return jsonify({"message": "YouTube opened"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
