import http.server
import socketserver
import threading
import sys
import os
import json
import time

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(DIRECTORY, 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
LOGS_FILE = os.path.join(DATA_DIR, 'activity_logs.json')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)

DATA_LOCK = threading.Lock()

def get_default_users():
    return [
        {
            "id": "user_admin",
            "name": "Thầy Nguyễn Tá Quan",
            "email": "nguyentaquan@gmail.com",
            "school": "Trường THCS Bán Trú Canh Thuận",
            "grade": "thcs",
            "subject": "HĐTN-HN, KHTN, Tin học (GVCN 8A1)",
            "role": "admin",
            "points": 500,
            "balance": 0,
            "demoUses": 999,
            "status": "active",
            "avatar": "👑",
            "joinDate": "01/01/2026",
            "lastLogin": "Vừa xong",
            "lastSeen": int(time.time()),
            "device": "💻 Máy Tính",
            "loginCount": 1
        }
    ]

def load_users():
    with DATA_LOCK:
        if not os.path.exists(USERS_FILE):
            users = get_default_users()
            save_users_no_lock(users)
            return users
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return get_default_users()

def save_users_no_lock(users):
    try:
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[EduStudio] Lỗi lưu users: {e}")

def save_users(users):
    with DATA_LOCK:
        save_users_no_lock(users)

def load_logs():
    with DATA_LOCK:
        if not os.path.exists(LOGS_FILE):
            default_logs = [
                {
                    "id": "LOG-1001",
                    "time": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "user": "Thầy Nguyễn Tá Quan",
                    "role": "👑 Quản Trị Master",
                    "action": "Khởi động máy chủ sư phạm EduStudio v3.10.40",
                    "module": "Quản Trị Hệ Thống",
                    "type": "auth",
                    "status": "Thành công"
                }
            ]
            try:
                with open(LOGS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(default_logs, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
            return default_logs
        try:
            with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

def append_log(log_item):
    with DATA_LOCK:
        logs = []
        if os.path.exists(LOGS_FILE):
            try:
                with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                    logs = json.load(f)
            except Exception:
                logs = []
        logs.insert(0, log_item)
        if len(logs) > 200:
            logs = logs[:200]
        try:
            with open(LOGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[EduStudio] Lỗi ghi log: {e}")


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Chặn toàn bộ cache trình duyệt để luôn nạp bản mới nhất
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Thêm CORS header để hỗ trợ fetch linh hoạt
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split('?')[0]

        if clean_path == '/api/users':
            users = load_users()
            now = int(time.time())
            for u in users:
                u['isOnline'] = (now - u.get('lastSeen', 0)) < 300
            data_bytes = json.dumps(users, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        elif clean_path == '/api/stats':
            users = load_users()
            now = int(time.time())
            online_count = sum(1 for u in users if (now - u.get('lastSeen', 0)) < 300)
            vip_count = sum(1 for u in users if u.get('role') in ('admin', 'vip', 'vip_pro'))
            total_logins = sum(u.get('loginCount', 1) for u in users)
            total_pts = sum(u.get('points', 0) for u in users)
            stats = {
                "totalUsers": len(users),
                "onlineCount": max(1, online_count),
                "vipCount": vip_count,
                "totalLogins": total_logins,
                "totalPoints": total_pts,
                "serverTime": time.strftime("%H:%M:%S %d/%m/%Y")
            }
            data_bytes = json.dumps(stats, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        elif clean_path == '/api/logs':
            logs = load_logs()
            data_bytes = json.dumps(logs, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0]

        if clean_path == '/api/users/sync':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
                return

            email = (data.get('email') or '').strip().lower()
            if not email:
                self.send_response(400)
                self.end_headers()
                return

            users = load_users()
            now = int(time.time())
            now_str = time.strftime("%H:%M %d/%m/%Y")
            is_admin = (email == 'nguyentaquan@gmail.com')

            existing = next((u for u in users if u.get('email', '').lower() == email), None)
            if existing:
                existing['lastLogin'] = f"Vừa xong ({now_str})"
                existing['lastSeen'] = now
                existing['loginCount'] = existing.get('loginCount', 1) + 1
                if data.get('device'):
                    existing['device'] = data['device']
                if data.get('name') and not is_admin:
                    existing['name'] = data['name']
                if data.get('school') and not is_admin:
                    existing['school'] = data['school']
                if data.get('phone'):
                    existing['phone'] = data['phone']
                if data.get('cccd'):
                    existing['cccd'] = data['cccd']
                if data.get('subject') and not is_admin:
                    existing['subject'] = data['subject']
                target_user = existing
            else:
                new_user = {
                    "id": f"user_{now % 10000:04d}",
                    "name": data.get('name') or ( "Thầy Nguyễn Tá Quan" if is_admin else email.split('@')[0] ),
                    "email": email,
                    "school": data.get('school') or ( "Trường THCS Bán Trú Canh Thuận" if is_admin else "" ),
                    "phone": data.get('phone') or "",
                    "cccd": data.get('cccd') or "",
                    "subject": data.get('subject') or ( "HĐTN-HN, KHTN, Tin học" if is_admin else "" ),
                    "grade": data.get('grade') or "thcs",
                    "role": "admin" if is_admin else (data.get('role') or "member"),
                    "points": 500 if is_admin else (data.get('points') or 0),
                    "balance": 0,
                    "demoUses": 999 if is_admin else 10,
                    "status": "active",
                    "avatar": "👑" if is_admin else (data.get('avatarEmoji') or "👨‍🏫"),
                    "joinDate": time.strftime("%d/%m/%Y"),
                    "lastLogin": f"Vừa xong ({now_str})",
                    "lastSeen": now,
                    "device": data.get('device') or "💻 Máy Tính",
                    "loginCount": 1
                }
                users.append(new_user)
                target_user = new_user

            save_users(users)

            # Ghi nhật ký đăng nhập thực tế
            append_log({
                "id": f"LOG-{now % 100000:05d}",
                "time": time.strftime("%Y-%m-%d %H:%M:%S"),
                "user": target_user['name'],
                "role": "👑 Quản Trị Master" if target_user['role'] == 'admin' else "👨‍🏫 Thành Viên",
                "action": f"Đăng nhập thành công ({target_user['email']}) trên {target_user.get('device', 'Máy Tính')}",
                "module": "Xác Thực Google",
                "type": "auth",
                "status": "Thành công"
            })

            res = {
                "success": True,
                "totalUsers": len(users),
                "user": target_user
            }
            data_bytes = json.dumps(res, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        elif clean_path == '/api/heartbeat':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                email = (data.get('email') or '').strip().lower()
                if email:
                    users = load_users()
                    u = next((x for x in users if x.get('email', '').lower() == email), None)
                    if u:
                        u['lastSeen'] = int(time.time())
                        save_users(users)
            except Exception:
                pass
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
            return

        elif clean_path == '/api/logs/add':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                append_log(data)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                return
            except Exception:
                self.send_response(400)
                self.end_headers()
                return

        super().do_POST()

    def log_message(self, format, *args):
        pass

def serve_port(port):
    class ReuseServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    try:
        with ReuseServer(("", port), NoCacheHTTPRequestHandler) as httpd:
            print(f"[EduStudio] Server dang hoat dong tai: http://localhost:{port}")
            httpd.serve_forever()
    except Exception as e:
        print(f"[EduStudio] Khong the mo cong {port}: {e}")

if __name__ == "__main__":
    print("=" * 65)
    print("      EDUSTUDIO v3.10.40 - DUAL SERVER CO CHUNG THUC THUC TE")
    print("=" * 65)
    
    # Khoi chay cong 8000 trong luong rieng
    t1 = threading.Thread(target=serve_port, args=(8000,), daemon=True)
    t1.start()

    # Khoi chay cong 8050 trong luong chinh
    serve_port(8050)
