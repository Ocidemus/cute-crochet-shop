// admin.js - Admin Portal dashboard logic for CuteCrochet Shop
const adminPortal = {
    passkey: '',
    orders: [],
    currentFilter: 'ALL',

    init() {
        const savedKey = sessionStorage.getItem('admin_passkey');
        if (savedKey) {
            this.passkey = savedKey;
            document.getElementById('admin-auth-modal').style.display = 'none';
            this.fetchOrders();
        } else {
            document.getElementById('admin-auth-modal').style.display = 'flex';
        }
    },

    async verifyPasskey() {
        const input = document.getElementById('admin-passkey-input').value.trim();
        const errorDiv = document.getElementById('auth-error-msg');

        if (!input) {
            errorDiv.innerText = 'Please enter your ADMIN_API_KEY passphrase.';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/admin/orders', {
                headers: { 'X-Admin-Key': input }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                this.passkey = input;
                sessionStorage.setItem('admin_passkey', input);
                document.getElementById('admin-auth-modal').style.display = 'none';
                this.orders = data.orders || [];
                this.renderDashboard();
            } else {
                errorDiv.innerText = data.error || 'Invalid Admin Key passphrase.';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.innerText = 'Failed to connect to backend server.';
            errorDiv.style.display = 'block';
        }
    },

    logoutAdmin() {
        sessionStorage.removeItem('admin_passkey');
        this.passkey = '';
        document.getElementById('admin-auth-modal').style.display = 'flex';
    },

    async fetchOrders() {
        if (!this.passkey) return;

        const loader = document.getElementById('admin-loader');
        const listDiv = document.getElementById('admin-orders-list');
        loader.style.display = 'block';
        listDiv.style.display = 'none';

        try {
            const res = await fetch('/api/admin/orders', {
                headers: { 'X-Admin-Key': this.passkey }
            });
            const data = await res.json();

            loader.style.display = 'none';
            listDiv.style.display = 'block';

            if (res.ok && data.success) {
                this.orders = data.orders || [];
                this.renderDashboard();
            } else {
                alert("Failed to load admin orders: " + (data.error || "Forbidden"));
            }
        } catch (err) {
            loader.style.display = 'none';
            console.error("Network error fetching admin orders:", err);
        }
    },

    setFilter(filterName, btn) {
        this.currentFilter = filterName;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderOrdersList();
    },

    renderDashboard() {
        let revenue = 0;
        let paidCount = 0;
        let pendingShipCount = 0;

        this.orders.forEach(o => {
            const isPaid = (o.status || '').toLowerCase() === 'paid' || (o.status || '').toLowerCase() === 'shipped';
            if (isPaid) {
                revenue += o.total_amount || 0;
                paidCount++;
            }
            if (isPaid && (!o.shipment || !o.shipment.tracking_number)) {
                pendingShipCount++;
            }
        });

        document.getElementById('metric-revenue').innerText = `₹${revenue.toFixed(2)}`;
        document.getElementById('metric-total-orders').innerText = this.orders.length;
        document.getElementById('metric-paid-orders').innerText = paidCount;
        document.getElementById('metric-pending-ship').innerText = pendingShipCount;

        this.renderOrdersList();
    },

    renderOrdersList() {
        const container = document.getElementById('admin-orders-list');

        let filtered = this.orders.filter(o => {
            const st = (o.status || '').toLowerCase();
            const isShipped = o.shipment && o.shipment.tracking_number;

            if (this.currentFilter === 'PAID') return st === 'paid';
            if (this.currentFilter === 'PENDING') return st === 'pending';
            if (this.currentFilter === 'SHIPPED') return st === 'shipped' || isShipped;
            return true;
        });        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 16px; border: 2px dashed var(--primary-light);">
                    <div style="font-size: 36px; margin-bottom: 10px; color: var(--primary);">
                        <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:40px; height:40px;"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 3h2l2.5 10a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5l1.5-7H6.5"/></svg>
                    </div>
                    <h3 style="color: var(--primary-dark);">No Orders Found</h3>
                    <p style="color: var(--text-muted); font-size: 13px;">No customer transactions match the selected filter.</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(o => {
            const st = (o.status || '').toLowerCase();
            const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const isPaid = st === 'paid' || st === 'shipped';

            // Items list
            let itemsHtml = '';
            (o.items || []).forEach(it => {
                itemsHtml += `
                    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                        <span><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px; height:10px; color:var(--primary); margin-right:4px;"><circle cx="12" cy="12" r="6"/></svg> <strong>${it.product_name || 'Crochet Item'}</strong> (x${it.quantity})</span>
                        <span style="color: var(--primary-dark); font-weight: 600;">₹${((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
                    </div>
                `;
            });

            // Address string
            const addr = o.address || {};
            const addrStr = addr.line1 ? `${addr.line1}, ${addr.line2 ? addr.line2 + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pincode}` : 'No address provided';

            // Shipment section
            let shipSection = '';
            if (o.shipment && o.shipment.tracking_number) {
                shipSection = `
                    <div style="background: #EBFDF8; border: 1px solid #C4F7E6; padding: 10px 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 13px; color: #1E6652;">
                            <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px; margin-right:4px;"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                            <strong>${o.shipment.courier_name}:</strong> #${o.shipment.tracking_number}
                        </span>
                        <span class="ship-badge">SHIPPED</span>
                    </div>
                `;
            } else if (isPaid) {
                shipSection = `
                    <button class="btn-cute" style="font-size: 12px; padding: 6px 14px;" onclick="adminPortal.openShipmentModal('${o.id}')">
                        + Attach Shiprocket Courier Tracking 
                        <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px; margin-left:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    </button>
                `;
            } else {
                shipSection = `<span style="font-size: 12px; color: var(--text-muted);">Awaiting Payment Verification...</span>`;
            }

            const statusBadgeHtml = isPaid
                ? `<span class="status-badge paid"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px; height:12px; margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg> PAID</span>`
                : `<span class="status-badge pending"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> PENDING</span>`;

            html += `
                <div class="admin-order-card">
                    <div class="admin-order-header">
                        <div>
                            <span style="font-weight: 700; color: var(--primary-dark);">Order #${o.id.substring(0, 8)}...</span>
                            <span style="font-size: 12px; color: var(--text-muted); margin-left: 10px;">${dateStr}</span>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            ${statusBadgeHtml}
                            <span style="font-weight: 800; font-size: 16px; color: var(--primary-dark);">₹${(o.total_amount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="admin-order-body">
                        <div class="admin-order-grid">
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">CUSTOMER DETAILS</div>
                                <div style="font-weight: 700; color: var(--text-main); font-size: 14px; margin-top: 4px;">${o.user_name || 'Guest'}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${o.user_email}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${o.user_phone || 'No phone'}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">SHIPPING DESTINATION</div>
                                <div style="font-size: 12px; color: var(--text-main); margin-top: 4px; line-height: 1.4;">${addrStr}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">RAZORPAY ORDER ID</div>
                                <div style="font-family: monospace; font-size: 12px; margin-top: 4px; color: var(--primary-dark);">${o.razorpay_order_id || 'N/A'}</div>
                            </div>
                        </div>

                        <div style="background: var(--bg-main); padding: 12px; border-radius: 10px; margin-bottom: 15px;">
                            ${itemsHtml}
                        </div>

                        <div style="display: flex; justify-content: flex-end;">
                            ${shipSection}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    openShipmentModal(orderId) {
        document.getElementById('ship-order-id').value = orderId;
        document.getElementById('ship-tracking-input').value = '';
        document.getElementById('shipment-modal').style.display = 'flex';
    },

    async submitShipment() {
        const orderId = document.getElementById('ship-order-id').value;
        const courier = document.getElementById('ship-courier-input').value.trim();
        const tracking = document.getElementById('ship-tracking-input').value.trim();

        if (!courier || !tracking) {
            alert("Please fill in both Courier Name and Tracking Number.");
            return;
        }

        try {
            const res = await fetch('/api/admin/shipments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': this.passkey
                },
                body: JSON.stringify({
                    orderId: orderId,
                    courierName: courier,
                    trackingNumber: tracking
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                document.getElementById('shipment-modal').style.display = 'none';
                alert("Shipment saved! Order marked as SHIPPED 📦");
                this.fetchOrders();
            } else {
                alert("Failed to attach shipment: " + (data.error || "Server error"));
            }
        } catch (err) {
            alert("Network error updating shipment.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminPortal.init();
});
