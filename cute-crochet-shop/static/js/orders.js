// orders.js - Fetch and render user order history and shipping details
const ordersPage = {
    orders: [],

    async init() {
        if (!window.auth || !window.auth.isAuthenticated()) {
            window.location.href = '/login.html?redirect=orders.html';
            return;
        }

        await this.fetchOrders();
    },

    async fetchOrders() {
        const loader = document.getElementById('orders-loader');
        const listDiv = document.getElementById('orders-list');
        const emptyDiv = document.getElementById('orders-empty');

        try {
            const response = await window.auth.fetchWithAuth('/api/orders');
            const data = await response.json();

            loader.style.display = 'none';

            if (response.ok && data.success) {
                this.orders = data.orders || [];
                
                if (this.orders.length === 0) {
                    emptyDiv.style.display = 'block';
                    listDiv.style.display = 'none';
                } else {
                    emptyDiv.style.display = 'none';
                    listDiv.style.display = 'block';
                    this.renderOrders(listDiv);
                }
            } else {
                console.error("Failed to load orders:", data.error);
                loader.innerHTML = `<p style="color:var(--text-danger)">Failed to load orders: ${data.error || "Server error."}</p>`;
            }
        } catch (err) {
            console.error("Network error fetching orders:", err);
            loader.innerHTML = `<p style="color:var(--text-danger)">A network error occurred. Please verify your connection.</p>`;
        }
    },

    renderOrders(container) {
        // Expose PRODUCTS catalog
        const productsCatalog = (window.app && window.app.PRODUCTS) || {
            'panda': { id: 'panda', name: 'Panda Crochet Keychain', price: 799.00, images: ['assets/panda_keychain_1.jpg'] },
            'brown-bear': { id: 'brown-bear', name: 'Teddy Bear Plushie (Brown)', price: 1299.00, images: ['assets/brown_bear.jpg'] },
            'white-bear': { id: 'white-bear', name: 'Teddy Bear Plushie (White)', price: 1299.00, images: ['assets/white_bear.jpg'] },
            'pink-bear': { id: 'pink-bear', name: 'Teddy Bear Plushie (Pink)', price: 1299.00, images: ['assets/bears_trio.jpg'] },
            'beige-bear': { id: 'beige-bear', name: 'Teddy Bear Plushie (Beige)', price: 1299.00, images: ['assets/beige_bear.jpg'] },
            'duck': { id: 'duck', name: 'Little Duck holding Flower', price: 699.00, images: ['assets/duck_flower.jpg'] },
            'capybara': { id: 'capybara', name: 'Capybara Plushie Keychain', price: 899.00, images: ['assets/capybara.jpg'] },
            'tulips': { id: 'tulips', name: 'Double Tulip Keychains', price: 499.00, images: ['assets/tulip_keychain.jpg'] },
            'heart': { id: 'heart', name: 'Crochet Heart Keychain', price: 299.00, images: ['assets/heart_box.jpg'] }
        };

        let html = '';

        // Sort orders newest first
        const sortedOrders = [...this.orders].sort((a, b) => {
            const dateA = new Date(a.created_at || a.CreatedAt);
            const dateB = new Date(b.created_at || b.CreatedAt);
            return dateB - dateA;
        });

        sortedOrders.forEach(order => {
            // Normalize column mappings for SQL null structures or standard JSON objects
            const orderId = order.id || order.ID;
            const rzpOrderId = order.razorpay_order_id || order.RazorpayOrderID || "N/A";
            const orderDateStr = order.created_at || order.CreatedAt;
            const status = (order.status || order.Status || "pending").toLowerCase();
            
            // Format order date
            const date = new Date(orderDateStr);
            const formattedDate = date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Extract numeric total
            let totalAmountVal = 0.0;
            const rawTotal = order.total_amount || order.TotalAmount;
            if (rawTotal) {
                if (typeof rawTotal === 'string') {
                    totalAmountVal = parseFloat(rawTotal);
                } else if (rawTotal.Float64Value) {
                    const fVal = rawTotal.Float64Value();
                    totalAmountVal = fVal.Float64;
                } else if (rawTotal.String) {
                    totalAmountVal = parseFloat(rawTotal.String);
                } else if (typeof rawTotal === 'number') {
                    totalAmountVal = rawTotal;
                }
            }

            // Build items list HTML
            let itemsHtml = '';
            const items = order.items || order.Items || [];
            items.forEach(item => {
                const prodId = item.product_id || item.variant_sku || item.ProductID || "";
                
                const product = (window.app && window.app.getProduct) ? window.app.getProduct(prodId) : (productsCatalog[prodId] || {
                    name: item.product_name || item.ProductName || "Crochet Friend",
                    images: ['assets/bears_colors.jpg']
                });

                let itemPrice = 0.0;
                const rawPrice = item.price_at_purchase || item.PriceAtPurchase;
                if (rawPrice) {
                    if (typeof rawPrice === 'string') {
                        itemPrice = parseFloat(rawPrice);
                    } else if (rawPrice.String) {
                        itemPrice = parseFloat(rawPrice.String);
                    } else if (typeof rawPrice === 'number') {
                        itemPrice = rawPrice;
                    }
                }

                const qty = item.quantity || item.Quantity || 1;

                itemsHtml += `
                    <div class="order-item-row">
                        <div class="order-item-info">
                            <img src="${product.images[0]}" class="order-item-img" alt="${product.name}">
                            <div class="order-item-details">
                                <span class="order-item-name">${product.name}</span>
                                <span class="order-item-qty">Quantity: ${qty}</span>
                            </div>
                        </div>
                        <span class="order-item-price">₹${(itemPrice * qty).toFixed(2)}</span>
                    </div>
                `;
            });

            // Build shipment / tracking section
            let shipmentHtml = '';
            const shipments = order.shipments || order.Shipments || [];
            if (shipments.length > 0) {
                const shipment = shipments[0];
                const carrier = shipment.carrier || shipment.Carrier || "Cozy Express";
                const trackingNum = shipment.tracking_number || shipment.TrackingNumber || "N/A";
                const shipStatus = shipment.status || shipment.Status || "preparing";

                shipmentHtml = `
                    <div class="shipment-section">
                        <div class="shipment-tracking">
                            <span style="font-size:16px;">🚚</span>
                            <span><strong>${carrier}:</strong> #${trackingNum}</span>
                        </div>
                        <span class="status-badge" style="font-size: 11px; padding: 4px 10px; background:#F0F4FF; color:#3F66E2; border:1px solid #D2E0FF;">
                            ${shipStatus.toUpperCase()}
                        </span>
                    </div>
                `;
            } else {
                shipmentHtml = `
                    <div class="shipment-section" style="color:var(--text-muted);">
                        <span>Status: Package is being lovingly packed for courier pickup... 🧸</span>
                    </div>
                `;
            }

            // Create cross-platform secure SVG status badges
            const statusHtml = status === 'paid'
                ? `<span class="status-badge paid"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px; height:12px; margin-right:4px;"><path d="M20 6 9 17l-5-5"/></svg> PAID</span>`
                : `<span class="status-badge pending"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px; margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> PENDING</span>`;

            // Assemble order card
            html += `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-meta-info">
                            <div class="order-meta-item">
                                <span class="order-meta-label">Order Placed</span>
                                <span class="order-meta-value">${formattedDate}</span>
                            </div>
                            <div class="order-meta-item">
                                <span class="order-meta-label">Total Amount</span>
                                <span class="order-meta-value" style="color:var(--primary-dark)">₹${totalAmountVal.toFixed(2)}</span>
                            </div>
                            <div class="order-meta-item">
                                <span class="order-meta-label">Payment ID</span>
                                <span class="order-meta-value" style="font-family:monospace; font-size:12px;">${rzpOrderId}</span>
                            </div>
                            <div class="order-meta-item">
                                <span class="order-meta-label">Status</span>
                                <div style="margin-top: 4px;">${statusHtml}</div>
                            </div>
                        </div>
                    </div>
                    <div class="order-body">
                        ${itemsHtml}
                    </div>
                    ${shipmentHtml}
                </div>
            `;
        });

        container.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ordersPage.init();
});
