import os
import sqlite3
import hashlib
import time

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Create Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        ''')
        
        # Create Cart Items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                created_at REAL NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, product_id)
            )
        ''')
        
        # Create Orders table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                payment_status TEXT NOT NULL,
                payment_id TEXT NOT NULL,
                shipping_address TEXT NOT NULL,
                created_at REAL NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Create Order Items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            )
        ''')
        
        # Create Contact Messages table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        ''')
        
        conn.commit()

def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16).hex()
    
    # Secure PBKDF2-HMAC-SHA256 password hashing
    pwd_bytes = password.encode('utf-8')
    salt_bytes = bytes.fromhex(salt)
    
    dk = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt_bytes, 100000)
    pwd_hash = dk.hex()
    return pwd_hash, salt

def register_user(username, email, password):
    pwd_hash, salt = hash_password(password)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO users (username, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)',
                (username, email, pwd_hash, salt, time.time())
            )
            conn.commit()
            return cursor.lastrowid
    except sqlite3.IntegrityError as e:
        if 'username' in str(e):
            raise ValueError("Username already exists")
        elif 'email' in str(e):
            raise ValueError("Email already registered")
        else:
            raise ValueError("User registration failed: database integrity error")

def authenticate_user(email, password):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user:
            return None
        
        saved_hash = user['password_hash']
        salt = user['salt']
        
        candidate_hash, _ = hash_password(password, salt)
        if hmac_compare(candidate_hash, saved_hash):
            return {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
    return None

def hmac_compare(a, b):
    # Constant-time comparison to prevent timing attacks
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a.encode('utf-8'), b.encode('utf-8')):
        result |= x ^ y
    return result == 0

def get_user_by_id(user_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, email FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        if user:
            return dict(user)
    return None

def get_cart_items(user_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT product_id, quantity FROM cart_items WHERE user_id = ?', (user_id,))
        return [dict(row) for row in cursor.fetchall()]

def sync_cart(user_id, local_cart):
    # local_cart is a list of dicts: [{'product_id': '...', 'quantity': 1}, ...]
    with get_db() as conn:
        cursor = conn.cursor()
        for item in local_cart:
            prod_id = item.get('product_id')
            qty = item.get('quantity', 1)
            
            # Check if item exists in db cart
            cursor.execute('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', (user_id, prod_id))
            row = cursor.fetchone()
            
            if row:
                # Merge quantities
                new_qty = row['quantity'] + qty
                cursor.execute(
                    'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
                    (new_qty, user_id, prod_id)
                )
            else:
                # Insert new
                cursor.execute(
                    'INSERT INTO cart_items (user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?)',
                    (user_id, prod_id, qty, time.time())
                )
        conn.commit()

def add_to_cart(user_id, product_id, quantity):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', (user_id, product_id))
        row = cursor.fetchone()
        
        if row:
            cursor.execute(
                'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
                (row['quantity'] + quantity, user_id, product_id)
            )
        else:
            cursor.execute(
                'INSERT INTO cart_items (user_id, product_id, quantity, created_at) VALUES (?, ?, ?, ?)',
                (user_id, product_id, quantity, time.time())
            )
        conn.commit()

def update_cart_item(user_id, product_id, quantity):
    with get_db() as conn:
        cursor = conn.cursor()
        if quantity <= 0:
            cursor.execute('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', (user_id, product_id))
        else:
            cursor.execute(
                'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
                (quantity, user_id, product_id)
            )
        conn.commit()

def remove_from_cart(user_id, product_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', (user_id, product_id))
        conn.commit()

def create_order(user_id, total_amount, payment_id, shipping_address, items):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Insert into orders
        cursor.execute(
            'INSERT INTO orders (user_id, total_amount, payment_status, payment_id, shipping_address, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, total_amount, 'PAID', payment_id, shipping_address, time.time())
        )
        order_id = cursor.lastrowid
        
        # Insert items
        for item in items:
            cursor.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                (order_id, item['product_id'], item['quantity'], item['price'])
            )
        
        # Clear database cart
        cursor.execute('DELETE FROM cart_items WHERE user_id = ?', (user_id,))
        
        conn.commit()
        return order_id

def save_contact_message(name, email, message):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO contact_messages (name, email, message, created_at) VALUES (?, ?, ?, ?)',
            (name, email, message, time.time())
        )
        conn.commit()
        return cursor.lastrowid

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DB_PATH)
