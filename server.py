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

import hashlib

def hash_password(pwd):
    if not pwd:
        return ""
    return hashlib.sha256(pwd.encode('utf-8')).hexdigest()

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
            "lastLogin": "Chưa đăng nhập",
            "lastSeen": 0,
            "device": "💻 Máy Tính",
            "loginCount": 0
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
                    "action": "Khởi động máy chủ sư phạm EduStudio v3.10.45",
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
            online_count = sum(1 for u in users if (now - u.get('lastSeen', 0)) < 120)
            vip_count = sum(1 for u in users if u.get('role') in ('admin', 'vip', 'vip_pro'))
            total_logins = sum(u.get('loginCount', 1) for u in users)
            total_pts = sum(u.get('points', 0) for u in users)
            stats = {
                "totalUsers": len(users),
                "onlineCount": online_count,
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
        if clean_path == '/api/auth/login':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
                return

            raw_email = (data.get('email') or '').strip().lower()
            password = (data.get('password') or '').strip()

            if not raw_email:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "⚠️ Vui lòng nhập địa chỉ Gmail!"
                }, ensure_ascii=False).encode('utf-8'))
                return

            if not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "⚠️ Vui lòng nhập mật khẩu Gmail!"
                }, ensure_ascii=False).encode('utf-8'))
                return

            # Chuẩn hóa email: nếu người dùng nhập 'nguyentaquan' hoặc 'nguyentaquan8' không có @, tự gắn @gmail.com
            email = raw_email if '@' in raw_email else f"{raw_email}@gmail.com"
            req_gemini_key = (data.get('geminiApiKey') or '').strip()
            pwd_hash = hash_password(password)
            users = load_users()
            now = int(time.time())
            now_str = time.strftime("%H:%M %d/%m/%Y")

            # Nhận diện Admin Master (Thầy Nguyễn Tá Quan)
            is_admin = (
                email in ('nguyentaquan@gmail.com', 'nguyentaquan8@gmail.com') or
                raw_email in ('nguyentaquan', 'nguyentaquan8')
            )

            if not is_admin and not email.endswith('@gmail.com'):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "⚠️ Bắt buộc đăng nhập/đăng ký bằng tài khoản Gmail (@gmail.com) để dùng gói Gemini Free cá nhân!"
                }, ensure_ascii=False).encode('utf-8'))
                return

            existing = next((u for u in users if u.get('email', '').lower() == email), None)

            # BẢO MẬT CHUẨN XÁC: ĐÃ XÓA BỎ MỌI MẬT KHẨU CỨNG (123) — CHỈ CHẤP NHẬN HASH THẬT HOẶC GOOGLE OAUTH
            if existing:
                user_pwd = existing.get('password')
                if not user_pwd:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "error": "🔒 Tài khoản này xác thực bằng Google. Vui lòng bấm nút xanh 'Đăng nhập bằng Google' ở phía trên!"
                    }, ensure_ascii=False).encode('utf-8'))
                    return

                if user_pwd != pwd_hash:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "error": "❌ Mật khẩu hoặc tài khoản EduStudio không chính xác. Vui lòng kiểm tra và nhập lại!"
                    }, ensure_ascii=False).encode('utf-8'))
                    return

                # Nếu đúng mật khẩu:
                existing['lastLogin'] = f"Vừa xong ({now_str})"
                existing['lastSeen'] = now
                existing['loginCount'] = existing.get('loginCount', 0) + 1
                if req_gemini_key:
                    existing['geminiApiKey'] = req_gemini_key
                if is_admin:
                    existing['role'] = 'admin'
                    existing['avatar'] = '👑'
                target_user = existing

            elif is_admin:
                # Đã xóa bỏ hoàn toàn MK 123: Tài khoản Admin phải đăng nhập qua Google OAuth chính chủ
                self.send_response(401)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "🔒 Đã xóa bỏ mật khẩu cũ (123). Tài khoản Quản trị vui lòng bấm nút xanh 'Đăng nhập bằng Google' ở trên để xác thực Gmail thật!"
                }, ensure_ascii=False).encode('utf-8'))
                return

            else:
                # Khóa hoàn toàn tự đăng ký không qua Google OAuth
                self.send_response(401)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "🔒 Hệ thống chỉ chấp nhận đăng nhập qua nút 'Đăng nhập bằng Google' chính thức để xác thực Gmail thật!"
                }, ensure_ascii=False).encode('utf-8'))
                return

            save_users(users)

            # Tính lại số online thực tế
            online_count = sum(1 for u in users if (now - u.get('lastSeen', 0)) < 120)

            try:
                add_system_log(
                    user_name=target_user.get('name'),
                    role=target_user.get('role'),
                    action=f"Đăng nhập thành công qua EduStudio ({target_user.get('email')})",
                    module="Xác Thực Đăng Nhập",
                    log_type="auth",
                    status="Thành công"
                )
            except Exception:
                pass

            resp_user = dict(target_user)
            if 'password' in resp_user:
                del resp_user['password']

            data_bytes = json.dumps({
                "success": True,
                "user": resp_user,
                "onlineCount": max(1, online_count),
                "totalUsers": len(users),
                "message": f"Xin chào {target_user.get('name')}!"
            }, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        elif clean_path == '/api/auth/google-oauth':
            import base64
            import urllib.request
            import urllib.parse
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

            id_token = (data.get('id_token') or '').strip()
            req_gemini_key = (data.get('geminiApiKey') or '').strip()
            if not id_token or '.' not in id_token:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Thiếu hoặc sai định dạng Google ID Token"}).encode('utf-8'))
                return

            claims = None
            expected_cid = "744815790631-enosh65nqge7q5k6k1bqdav46a7tlbeg.apps.googleusercontent.com"
            try:
                url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + urllib.parse.quote(id_token)
                with urllib.request.urlopen(url, timeout=8) as resp:
                    claims = json.loads(resp.read().decode('utf-8'))
            except urllib.error.HTTPError:
                claims = None
            except Exception:
                claims = None

            if (not claims or not claims.get('email')
                    or claims.get('email_verified') not in (True, 'true')
                    or claims.get('aud') != expected_cid):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Không xác thực được tài khoản Google hợp lệ!"}).encode('utf-8'))
                return

            email = claims['email'].strip().lower()
            full_name = (claims.get('name') or email.split('@')[0]).strip()
            picture = claims.get('picture') or ''
            is_admin = email in ('nguyentaquan@gmail.com', 'nguyentaquan8@gmail.com')

            users = load_users()
            now = int(time.time())
            now_str = time.strftime("%H:%M %d/%m/%Y")
            existing = next((u for u in users if u.get('email', '').lower() == email), None)

            if existing:
                existing['lastLogin'] = f"Google OAuth ({now_str})"
                existing['lastSeen'] = now
                existing['loginCount'] = existing.get('loginCount', 0) + 1
                if picture: existing['picture'] = picture
                if req_gemini_key: existing['geminiApiKey'] = req_gemini_key
                if is_admin:
                    existing['role'] = 'admin'
                    existing['avatar'] = '👑'
                target_user = existing
            else:
                target_user = {
                    "id": ("admin_" if is_admin else "user_") + email.split('@')[0],
                    "name": "Thầy Nguyễn Tá Quan" if is_admin else full_name,
                    "email": email,
                    "picture": picture,
                    "geminiApiKey": req_gemini_key,
                    "school": "Trường THCS Bán Trú Canh Thuận" if is_admin else "",
                    "phone": "",
                    "cccd": "",
                    "subject": "HĐTN-HN, KHTN, Tin học" if is_admin else "",
                    "grade": "thcs",
                    "role": "admin" if is_admin else "member",
                    "points": 999999 if is_admin else 100,
                    "balance": 0,
                    "demoUses": 999 if is_admin else 20,
                    "status": "active",
                    "avatar": "👑" if is_admin else "👨‍🏫",
                    "joinDate": time.strftime("%d/%m/%Y"),
                    "lastLogin": f"Google OAuth ({now_str})",
                    "lastSeen": now,
                    "device": "💻 Máy Tính",
                    "loginCount": 1
                }
                users.append(target_user)

            save_users(users)
            online_count = sum(1 for u in users if (now - u.get('lastSeen', 0)) < 120)
            resp_user = dict(target_user)
            resp_user.pop('password', None)

            data_bytes = json.dumps({
                "success": True,
                "user": resp_user,
                "onlineCount": max(1, online_count),
                "totalUsers": len(users)
            }, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        elif clean_path == '/api/heartbeat':
            online_count = 0
            total_users = 0
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                raw_email = (data.get('email') or '').strip().lower()
                email = raw_email if '@' in raw_email else f"{raw_email}@gmail.com"
                if email:
                    users = load_users()
                    u = next((x for x in users if x.get('email', '').lower() == email), None)
                    now = int(time.time())
                    if u:
                        u['lastSeen'] = now
                        save_users(users)
                    online_count = sum(1 for x in users if (now - x.get('lastSeen', 0)) < 120)
                    total_users = len(users)
            except Exception:
                pass

            data_bytes = json.dumps({"status": "ok", "onlineCount": max(1, online_count), "totalUsers": total_users}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data_bytes)))
            self.end_headers()
            self.wfile.write(data_bytes)
            return

        elif clean_path == '/api/auth/logout':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                raw_email = (data.get('email') or '').strip().lower()
                email = raw_email if '@' in raw_email else f"{raw_email}@gmail.com"
                if email:
                    users = load_users()
                    u = next((x for x in users if x.get('email', '').lower() == email), None)
                    if u:
                        u['lastSeen'] = 0
                        save_users(users)
            except Exception:
                pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'{"success": true}')
            return

        elif clean_path == '/api/users/update':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
                return

            email = (data.get('email') or '').strip().lower()
            uid = data.get('id')
            users = load_users()
            target = next((u for u in users if (email and u.get('email', '').lower() == email) or (uid and u.get('id') == uid)), None)

            if target:
                if 'name' in data and data['name']: target['name'] = data['name'].strip()
                if 'school' in data: target['school'] = data['school'].strip()
                if 'phone' in data: target['phone'] = data['phone'].strip()
                if 'cccd' in data: target['cccd'] = data['cccd'].strip()
                if 'subject' in data: target['subject'] = data['subject'].strip()
                if 'grade' in data: target['grade'] = data['grade'].strip()
                if 'geminiApiKey' in data: target['geminiApiKey'] = (data.get('geminiApiKey') or '').strip()
                new_pwd = (data.get('newPassword') or '').strip()
                if new_pwd:
                    target['password'] = hash_password(new_pwd)
                save_users(users)
                safe_user = dict(target)
                safe_user.pop('password', None)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "user": safe_user}, ensure_ascii=False).encode('utf-8'))
                return
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Không tìm thấy tài khoản người dùng"}, ensure_ascii=False).encode('utf-8'))
                return

        elif clean_path == '/api/users/update-ai-key':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body)
                email = (data.get('email') or '').strip().lower()
                key = (data.get('geminiApiKey') or '').strip()
                users = load_users()
                target = next((u for u in users if email and u.get('email', '').lower() == email), None)
                if target:
                    target['geminiApiKey'] = key
                    save_users(users)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
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
    print("      EDUSTUDIO v3.10.45 - DUAL SERVER CO CHUNG THUC THUC TE")
    print("=" * 65)
    
    # Khoi chay cong 8000 trong luong rieng
    t1 = threading.Thread(target=serve_port, args=(8000,), daemon=True)
    t1.start()

    # Khoi chay cong 8050 trong luong chinh
    serve_port(8050)
