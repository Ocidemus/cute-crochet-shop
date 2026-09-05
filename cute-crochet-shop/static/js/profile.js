/**
 * CuteCrochet Shop - Profile & Account Dashboard
 */

window.profile = {
    async init() {
        if (!window.auth || !window.auth.isAuthenticated()) {
            window.location.href = 'login.html?redirect=profile.html';
            return;
        }

        await this.loadUserProfile();
        this.loadCartPreview();
        await this.loadOrderHistory();
    },

    async loadUserProfile() {
        const token = window.auth ? window.auth.getToken() : null;
        const localUser = window.auth ? window.auth.getUser() : null;

        // Fallback display from local storage immediately so there is no loading delay
        if (localUser) {
            const userName = localUser.name || localUser.username || 'Crochet Lover';
            document.getElementById('profile-user-name').innerText = userName;
            document.getElementById('profile-user-email').innerText = localUser.email || '';
            const initials = userName.charAt(0).toUpperCase();
            document.getElementById('profile-avatar-initials').innerText = initials;
            if (document.getElementById('profile-name')) document.getElementById('profile-name').value = userName;
        }

        if (!token) return;

        try {
            const resp = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            const data = await resp.json();

            if (resp.ok && data.success && data.user) {
                const user = data.user;
                const displayName = user.name || user.username || 'Crochet Lover';
                document.getElementById('profile-user-name').innerText = displayName;
                document.getElementById('profile-user-email').innerText = user.email || '';
                
                // Avatar initials
                const initials = displayName.charAt(0).toUpperCase();
                document.getElementById('profile-avatar-initials').innerText = initials;

                // Form values
                if (document.getElementById('profile-name')) document.getElementById('profile-name').value = user.name || user.username || '';
                if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = user.phone || '';

                if (data.address) {
                    const addr = data.address;
                    if (document.getElementById('profile-line1')) document.getElementById('profile-line1').value = addr.line1 || '';
                    if (document.getElementById('profile-line2')) document.getElementById('profile-line2').value = addr.line2 || '';
                    if (document.getElementById('profile-city')) document.getElementById('profile-city').value = addr.city || '';
                    if (document.getElementById('profile-state')) document.getElementById('profile-state').value = addr.state || '';
                    if (document.getElementById('profile-pincode')) document.getElementById('profile-pincode').value = addr.pincode || '';

                    // Store saved shipping address in localStorage for auto-filling checkout
                    localStorage.setItem('saved_shipping_address', JSON.stringify({
                        name: user.name || user.username,
                        phone: user.phone,
                        line1: addr.line1,
                        line2: addr.line2,
                        city: addr.city,
                        state: addr.state,
                        pincode: addr.pincode
                    }));
                }
            }
        } catch (err) {
            console.error('Failed to load user profile:', err);
        }
    },

    async saveProfileAddress(e) {
        e.preventDefault();
        const token = window.auth ? window.auth.getToken() : null;
        const msgEl = document.getElementById('profile-msg');
        msgEl.style.display = 'block';
        msgEl.style.color = 'var(--text-muted)';
        msgEl.innerText = 'Saving profile details...';

        const payload = {
            name: document.getElementById('profile-name').value.trim(),
            phone: document.getElementById('profile-phone').value.trim(),
            line1: document.getElementById('profile-line1').value.trim(),
            line2: document.getElementById('profile-line2').value.trim(),
            city: document.getElementById('profile-city').value.trim(),
            state: document.getElementById('profile-state').value.trim(),
            pincode: document.getElementById('profile-pincode').value.trim()
        };

        try {
            const resp = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                msgEl.style.color = '#10B981';
                msgEl.innerText = '✓ Profile & Shipping Address saved successfully!';

                // Update local storage
                localStorage.setItem('saved_shipping_address', JSON.stringify(payload));
                document.getElementById('profile-user-name').innerText = payload.name;
            } else {
                msgEl.style.color = '#EF4444';
                msgEl.innerText = data.error || 'Failed to update profile.';
            }
        } catch (err) {
            msgEl.style.color = '#EF4444';
            msgEl.innerText = 'Network error saving profile.';
        }
    },

    loadCartPreview() {
        const cartContainer = document.getElementById('profile-cart-container');
        const actionArea = document.getElementById('profile-cart-action-area');
        if (!cartContainer || !actionArea) return;

        const cart = window.app && window.app.getCart ? window.app.getCart() : [];

        if (!cart || cart.length === 0) {
            cartContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                    <p style="font-size: 32px; margin-bottom: 8px;">🧺</p>
                    <p style="font-size: 14px; font-weight: 600;">Your shopping basket is currently empty.</p>
                </div>
            `;
            actionArea.innerHTML = `
                <a href="index.html" class="btn-cute btn-secondary" style="width: 100%; text-align: center; text-decoration: none;">Explore Shop Catalog</a>
            `;
            return;
        }

        let total = 0;
        let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        cart.forEach(item => {
            const prod = window.app.getProduct(item.product_id);
            const prodPrice = prod ? prod.price : (item.price || 499.00);
            const prodName = prod ? prod.name : item.product_id;
            const prodImg = (prod && prod.images && prod.images[0]) ? prod.images[0] : 'assets/bears_colors.jpg';
            const subtotal = prodPrice * item.quantity;
            total += subtotal;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #FFF5F7; padding: 10px 14px; border-radius: 10px; border: 1px solid #FFD6E0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${prodImg}" alt="${prodName}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px;">
                        <div>
                            <p style="font-weight: 600; font-size: 14px; margin: 0; color: var(--primary-dark);">${prodName}</p>
                            <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Qty: ${item.quantity} × ₹${prodPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <span style="font-weight: 700; font-size: 14px; color: var(--primary);">₹${subtotal.toFixed(2)}</span>
                </div>
            `;
        });
        html += '</div>';

        cartContainer.innerHTML = html;
        actionArea.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 14px; color: var(--text-muted); font-weight: 600;">Basket Total:</span>
                <span style="font-size: 20px; font-weight: 800; color: var(--primary-dark);">₹${total.toFixed(2)}</span>
            </div>
            <a href="checkout.html" class="btn-cute" style="width: 100%; text-align: center; text-decoration: none;">Proceed to Checkout &rarr;</a>
        `;
    },

    async loadOrderHistory() {
        const container = document.getElementById('profile-orders-container');
        if (!container) return;
        const token = window.auth ? window.auth.getToken() : null;

        if (!token) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 0; color: var(--text-muted);">
                    <p style="font-size: 14px;">Please log in to view past order history.</p>
                </div>
            `;
            return;
        }

        try {
            const resp = await fetch('/api/orders', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            const data = await resp.json();

            if (!resp.ok || !data.success || !data.orders || data.orders.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                        <p style="font-size: 36px; margin-bottom: 8px;">📦</p>
                        <p style="font-size: 16px; font-weight: 700; color: var(--primary-dark);">No past orders found yet</p>
                        <p style="font-size: 13px;">When you place an order, your receipts and downloadable PDF invoices will appear here!</p>
                        <a href="index.html" class="btn-cute btn-secondary" style="display: inline-block; margin-top: 15px; text-decoration: none;">Browse Shop Catalog</a>
                    </div>
                `;
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';
            data.orders.forEach(order => {
                const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const isPaid = order.status.toLowerCase() === 'paid' || order.status.toLowerCase() === 'completed';
                const statusBadge = isPaid
                    ? '<span class="status-badge status-paid" style="background: #EBFDF8; color: #1E6652; border: 1px solid #C4F7E6; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">PAID & VERIFIED</span>'
                    : '<span class="status-badge status-pending" style="background: #FFF5F7; color: #D84A67; border: 1px solid #FFD6E0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">PENDING PAYMENT</span>';

                let itemsList = '';
                if (order.items && order.items.length > 0) {
                    order.items.forEach(it => {
                        itemsList += `<li>${it.product_name || 'Handmade Crochet Item'} (Qty: ${it.quantity}) - ₹${parseFloat(it.price_at_purchase).toFixed(2)}</li>`;
                    });
                } else {
                    itemsList = '<li>Handmade Crochet Plushies / Keychains</li>';
                }

                html += `
                    <div class="cute-card" style="border: 2px solid #FFD6E0; background: #FFFDF8; padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; border-bottom: 1px dashed #FFD6E0; padding-bottom: 12px; margin-bottom: 12px;">
                            <div>
                                <h3 style="font-size: 16px; color: var(--primary-dark); margin: 0 0 4px 0;">Order #${(order.id || '').substring(0, 8).toUpperCase()}</h3>
                                <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Placed on ${dateStr}</p>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>

                        <div style="margin-bottom: 14px;">
                            <ul style="padding-left: 20px; font-size: 13px; color: var(--text-main); margin: 0 0 10px 0;">
                                ${itemsList}
                            </ul>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px dashed #FFD6E0; padding-top: 12px;">
                            <div>
                                <span style="font-size: 13px; color: var(--text-muted);">Total Amount: </span>
                                <span style="font-size: 18px; font-weight: 800; color: var(--primary-dark);">₹${parseFloat(order.total_amount).toFixed(2)}</span>
                            </div>
                            <button type="button" class="btn-cute btn-secondary" onclick="window.print()" style="padding: 8px 16px; font-size: 13px;">
                                Download Invoice (PDF) <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            container.innerHTML = html;
        } catch (err) {
            console.error('Failed to fetch orders history:', err);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                    <p style="font-size: 36px; margin-bottom: 8px;">📦</p>
                    <p style="font-size: 16px; font-weight: 700; color: var(--primary-dark);">No past orders found yet</p>
                    <p style="font-size: 13px;">When you place an order, your receipts and downloadable PDF invoices will appear here!</p>
                </div>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    profile.init();
});
