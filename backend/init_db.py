from main import app, db

with app.app_context():
    db.create_all()
    print("✅ Đã tạo cơ sở dữ liệu appointments.db")
