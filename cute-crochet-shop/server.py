import os
import sys
import json
import mimetypes
import base64
import hmac
import hashlib
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import database

JWT_SECRET = "cute_crochet_secret_token_key_2026_safe"
PORT = 8080

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def generate_jwt(user_id, username, email):
    # Expire in 24 hours
    payload = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "exp": time.time() + 86400
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    
    header_b64 = base64url_encode(header_json)
    payload_b64 = base64url_encode(payload_json)
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_sig_b64 = base64url_encode(expected_sig)
        
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None
            
        payload_bytes = base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        if payload.get('exp', 0) < time.time():
            return None # Expired
            
        return payload
    except Exception:
        return None

class CrochetRequestHandler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def get_authorized_user(self):
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        token = auth_header.split(' ')[1]
        return verify_jwt(token)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # API Routes
        if path.startswith('/api/'):
            if path == '/api/cart':
                user = self.get_authorized_user()
                if not user:
                    return self.send_json({"error": "Unauthorized"}, 401)
                
                try:
                    items = database.get_cart_items(user['user_id'])
                    return self.send_json({"success": True, "cart": items})
                except Exception as e:
                    return self.send_json({"error": str(e)}, 500)
            
            return self.send_json({"error": "Not Found"}, 404)
            
        # Static File Routes
        if path == '/':
            path = '/index.html'
            
        # Protect server directory traversal
        clean_path = path.lstrip('/')
        if '..' in clean_path or clean_path.startswith('/'):
            self.send_error(403, "Forbidden")
            return
            
        base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
        file_path = os.path.join(base_dir, clean_path)
        
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            # Fallback for page links without .html extension (e.g. /about to /about.html)
            if not file_path.endswith('.html') and os.path.exists(file_path + '.html'):
                file_path += '.html'
            else:
                self.send_error(404, "File Not Found")
                return

        # Serve static file
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
            
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Server Error: {str(e)}")

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if not path.startswith('/api/'):
            return self.send_json({"error": "Not Found"}, 404)
            
        # Parse JSON request body
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body) if body else {}
        except Exception:
            return self.send_json({"error": "Invalid JSON"}, 400)
            
        # API Endpoints
        if path == '/api/register':
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            
            if not username or not email or not password:
                return self.send_json({"error": "Missing required fields"}, 400)
                
            try:
                user_id = database.register_user(username, email, password)
                token = generate_jwt(user_id, username, email)
                return self.send_json({
                    "success": True, 
                    "token": token,
                    "user": {"id": user_id, "username": username, "email": email}
                })
            except ValueError as e:
                return self.send_json({"error": str(e)}, 400)
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/login':
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return self.send_json({"error": "Missing email or password"}, 400)
                
            try:
                user = database.authenticate_user(email, password)
                if not user:
                    return self.send_json({"error": "Invalid email or password"}, 401)
                    
                token = generate_jwt(user['id'], user['username'], user['email'])
                return self.send_json({
                    "success": True,
                    "token": token,
                    "user": {"id": user['id'], "username": user['username'], "email": user['email']}
                })
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/cart/sync':
            user = self.get_authorized_user()
            if not user:
                return self.send_json({"error": "Unauthorized"}, 401)
                
            local_cart = data.get('cart', [])
            try:
                database.sync_cart(user['user_id'], local_cart)
                return self.send_json({"success": True})
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/cart/add':
            user = self.get_authorized_user()
            if not user:
                return self.send_json({"error": "Unauthorized"}, 401)
                
            prod_id = data.get('product_id')
            qty = data.get('quantity', 1)
            
            if not prod_id:
                return self.send_json({"error": "Missing product_id"}, 400)
                
            try:
                database.add_to_cart(user['user_id'], prod_id, qty)
                return self.send_json({"success": True})
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/cart/update':
            user = self.get_authorized_user()
            if not user:
                return self.send_json({"error": "Unauthorized"}, 401)
                
            prod_id = data.get('product_id')
            qty = data.get('quantity')
            
            if not prod_id or qty is None:
                return self.send_json({"error": "Missing product_id or quantity"}, 400)
                
            try:
                database.update_cart_item(user['user_id'], prod_id, qty)
                return self.send_json({"success": True})
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/cart/remove':
            user = self.get_authorized_user()
            if not user:
                return self.send_json({"error": "Unauthorized"}, 401)
                
            prod_id = data.get('product_id')
            if not prod_id:
                return self.send_json({"error": "Missing product_id"}, 400)
                
            try:
                database.remove_from_cart(user['user_id'], prod_id)
                return self.send_json({"success": True})
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/checkout':
            user = self.get_authorized_user()
            if not user:
                return self.send_json({"error": "Unauthorized"}, 401)
                
            shipping = data.get('shipping_address')
            total = data.get('total_amount')
            pay_token = data.get('payment_token')
            items = data.get('items', [])
            
            if not shipping or not total or not pay_token or not items:
                return self.send_json({"error": "Missing order details or payment confirmation"}, 400)
                
            try:
                # Simulating Stripe validation
                if not pay_token.startswith('tok_'):
                    return self.send_json({"error": "Invalid secure payment token"}, 400)
                
                order_id = database.create_order(user['user_id'], total, pay_token, shipping, items)
                return self.send_json({"success": True, "order_id": order_id})
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        elif path == '/api/contact':
            name = data.get('name')
            email = data.get('email')
            message = data.get('message')
            
            if not name or not email or not message:
                return self.send_json({"error": "Missing contact details"}, 400)
                
            try:
                database.save_contact_message(name, email, message)
                return self.send_json({"success": True})
            except Exception as e:
                return self.send_json({"error": str(e)}, 500)
                
        return self.send_json({"error": "Not Found"}, 404)

def run_server():
    database.init_db()
    server_address = ('', PORT)
    httpd = ThreadingHTTPServer(server_address, CrochetRequestHandler)
    print(f"Server running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
