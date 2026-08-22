import sys
import os

# Set path to current directory to import local files
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database
import server

def run_tests():
    print("Running Automated Tests...")
    
    # 1. Reset database for testing
    if os.path.exists(database.DB_PATH):
        os.remove(database.DB_PATH)
        print("Cleared previous test database.")
        
    database.init_db()
    print("Database initialized successfully.")
    
    # 2. Test user registration
    username = "test_user_cute"
    email = "test@cute.com"
    password = "secretpassword123"
    
    try:
        user_id = database.register_user(username, email, password)
        print(f"PASS: User registered successfully. ID: {user_id}")
    except Exception as e:
        print(f"FAIL: User registration failed: {e}")
        return
        
    # Test duplicate username registration
    try:
        database.register_user(username, "another@cute.com", password)
        print("FAIL: Registered duplicate username.")
    except ValueError as e:
        print(f"PASS: Prevented duplicate username successfully: {e}")
        
    # 3. Test authentication
    user = database.authenticate_user(email, password)
    if user and user['username'] == username:
        print("PASS: User authenticated successfully.")
    else:
        print("FAIL: Authentication failed for valid user.")
        
    # Test invalid password authentication
    user_invalid = database.authenticate_user(email, "wrongpassword")
    if user_invalid is None:
        print("PASS: Prevented authentication with invalid password.")
    else:
        print("FAIL: Authenticated user with invalid password.")
        
    # 4. Test Token Sign/Verify
    token = server.generate_jwt(user_id, username, email)
    print(f"JWT Token generated: {token[:30]}...")
    
    decoded = server.verify_jwt(token)
    if decoded and decoded['user_id'] == user_id and decoded['username'] == username:
        print("PASS: JWT encoded and verified successfully.")
    else:
        print("FAIL: JWT token verification failed.")
        
    # Test invalid token verification
    corrupted_token = token[:-5] + "abcde"
    decoded_invalid = server.verify_jwt(corrupted_token)
    if decoded_invalid is None:
        print("PASS: Prevented verification of corrupted JWT token.")
    else:
        print("FAIL: Verified a corrupted JWT token.")
        
    # 5. Test Cart Management
    database.add_to_cart(user_id, "panda", 2)
    items = database.get_cart_items(user_id)
    if len(items) == 1 and items[0]['product_id'] == 'panda' and items[0]['quantity'] == 2:
        print("PASS: Product added and retrieved from database cart.")
    else:
        print("FAIL: Cart add/get logic failed.")
        
    # Sync cart test
    local_cart = [{'product_id': 'panda', 'quantity': 1}, {'product_id': 'pink-bear', 'quantity': 3}]
    database.sync_cart(user_id, local_cart)
    items = database.get_cart_items(user_id)
    # Total panda quantity should be 3 now, and pink-bear quantity should be 3
    panda_item = next((i for i in items if i['product_id'] == 'panda'), None)
    pink_bear_item = next((i for i in items if i['product_id'] == 'pink-bear'), None)
    
    if panda_item and panda_item['quantity'] == 3 and pink_bear_item and pink_bear_item['quantity'] == 3:
        print("PASS: Local cart successfully merged and synced with database cart.")
    else:
        print("FAIL: Cart sync logic failed.")
        
    # Create order test
    items_to_order = [
        {'product_id': 'panda', 'quantity': 3, 'price': 11.99},
        {'product_id': 'pink-bear', 'quantity': 3, 'price': 18.99}
    ]
    order_id = database.create_order(user_id, 92.94, 'tok_test_payment_123', '123 Test St, Test City', items_to_order)
    if order_id:
        # Check cart is cleared after order
        cleared_cart = database.get_cart_items(user_id)
        if len(cleared_cart) == 0:
            print(f"PASS: Order created (ID: {order_id}) and cart cleared successfully.")
        else:
            print("FAIL: Cart not cleared after order creation.")
    else:
        print("FAIL: Order creation failed.")

if __name__ == '__main__':
    run_tests()
