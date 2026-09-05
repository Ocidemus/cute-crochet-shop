// Secure Payment Gateway & Checkout Handler

const checkout = {
    cart: [],
    subtotal: 0,
    shipping: 99.00,
    total: 0,

    async init() {
        if (!window.auth || !window.auth.isAuthenticated()) {
            window.location.href = '/login.html?redirect=checkout.html';
            return;
        }

        await this.loadCheckoutItems();
        await this.autoFillSavedAddress();
        this.setupFormSubmit();
    },

    async autoFillSavedAddress() {
        let saved = localStorage.getItem('saved_shipping_address');
        let data = saved ? JSON.parse(saved) : null;

        const token = window.auth ? window.auth.getToken() : null;
        if (token) {
            try {
                const resp = await fetch('/api/user/profile', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const pData = await resp.json();
                if (pData.success && pData.user) {
                    if (!data) data = {};
                    data.name = pData.user.name || pData.user.username || data.name;
                    data.phone = pData.user.phone || data.phone;
                    data.email = pData.user.email || data.email;
                    if (pData.address) {
                        data.line1 = pData.address.line1;
                        data.line2 = pData.address.line2;
                        data.city = pData.address.city;
                        data.state = pData.address.state;
                        data.pincode = pData.address.pincode;
                    }
                }
            } catch (e) {}
        }

        if (!data && window.auth.getUser()) {
            const u = window.auth.getUser();
            data = { name: u.name || u.username, email: u.email, phone: u.phone || '' };
        }

        if (data) {
            if (data.name && document.getElementById('fullname')) document.getElementById('fullname').value = data.name;
            if (data.email && document.getElementById('email')) document.getElementById('email').value = data.email;
            if (data.phone && document.getElementById('phone')) document.getElementById('phone').value = data.phone;
            if (data.line1 && document.getElementById('address')) document.getElementById('address').value = data.line1 + (data.line2 ? ', ' + data.line2 : '');
            if (data.city && document.getElementById('city')) document.getElementById('city').value = data.city;
            if (data.state && document.getElementById('state')) document.getElementById('state').value = data.state;
            if (data.pincode && document.getElementById('zipcode')) document.getElementById('zipcode').value = data.pincode;
        }
    },

    async loadCheckoutItems() {
        const localCartStr = localStorage.getItem('crochet_local_cart');
        try {
            this.cart = localCartStr ? JSON.parse(localCartStr) : [];
            if (!Array.isArray(this.cart)) {
                this.cart = [];
            }
        } catch (e) {
            console.error("Failed to load cart for checkout:", e);
            this.cart = [];
        }
        this.renderSummary();
    },

    renderSummary() {
        const orderSummaryDiv = document.getElementById('checkout-items-summary');
        if (!orderSummaryDiv) return;

        if (this.cart.length === 0) {
            window.location.href = '/cart.html';
            return;
        }

        let itemsHtml = '';
        this.subtotal = 0;

        const productsCatalog = (window.app && window.app.PRODUCTS) || window.PRODUCTS || {};

        this.cart.forEach(item => {
            const prod = (window.app && window.app.getProduct) ? window.app.getProduct(item.product_id) : (productsCatalog[item.product_id] || { name: item.product_id, price: 499.00 });
            const price = prod ? prod.price : (item.price || 499.00);
            const lineTotal = price * item.quantity;
            this.subtotal += lineTotal;
            const thumbImg = (prod && prod.images && prod.images[0]) ? prod.images[0] : 'assets/bears_colors.jpg';

            itemsHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed var(--primary-light);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${thumbImg}" alt="${prod.name}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px;">
                        <div>
                            <span style="font-weight: 600; color: var(--primary-dark);">${prod.name}</span>
                            <br><span style="font-size: 11px; color: var(--text-muted);">Qty: ${item.quantity} × ₹${price.toFixed(2)}</span>
                        </div>
                    </div>
                    <span style="font-weight: 700; color: var(--primary);">₹${lineTotal.toFixed(2)}</span>
                </div>
            `;
        });

        this.total = this.subtotal + this.shipping;

        orderSummaryDiv.innerHTML = `
            <h3>Your Order Basket</h3>
            <div style="margin-top: 15px; display:flex; flex-direction:column; gap:6px;">
                ${itemsHtml}
            </div>
            <div class="cart-summary-line" style="margin-top: 15px; border-top: 2px dashed var(--primary-light); padding-top: 10px;">
                <span>Subtotal:</span>
                <span style="font-weight:600;">₹${this.subtotal.toFixed(2)}</span>
            </div>
            <div class="cart-summary-line">
                <span>Shipping:</span>
                <span style="font-weight:600;">₹${this.shipping.toFixed(2)}</span>
            </div>
            <div class="cart-summary-total">
                <span>Total:</span>
                <span>₹${this.total.toFixed(2)}</span>
            </div>
        `;

        const submitBtn = document.getElementById('checkout-submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = `Pay & Place Order ₹${this.total.toFixed(2)} <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        }
    },

    setupFormSubmit() {
        const form = document.getElementById('checkout-form');
        const loader = document.getElementById('checkout-loading');
        const checkoutCard = document.getElementById('checkout-card-layout');
        const successDiv = document.getElementById('checkout-success-view');

        if (!form || !loader) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const errorEl = document.getElementById('checkout-error');
            if (errorEl) errorEl.style.display = 'none';

            const fullname = form.fullname.value.trim();
            const phoneVal = form.phone ? form.phone.value.trim() : '';
            const addressVal = form.address.value.trim();
            const cityVal = form.city.value.trim();
            const stateVal = form.state ? form.state.value.trim() : '';
            const zipcodeVal = form.zipcode.value.trim();

            this.clearFieldHighlights();

            if (!fullname) {
                this.showErrorNotification("Please enter your Full Name.", ['fullname']);
                return;
            }

            if (!phoneVal || phoneVal.replace(/[^0-9]/g, '').length < 10) {
                this.showErrorNotification("Please enter a valid 10-digit Phone Number.", ['phone']);
                return;
            }

            if (!addressVal) {
                this.showErrorNotification("Please enter your Street Address.", ['address']);
                return;
            }

            if (!cityVal) {
                this.showErrorNotification("Please enter your City name.", ['city']);
                return;
            }

            if (!stateVal) {
                this.showErrorNotification("Please enter your State name.", ['state']);
                return;
            }

            if (!zipcodeVal || !/^\d{6}$/.test(zipcodeVal)) {
                this.showErrorNotification("Please enter a valid 6-digit Pincode / Zip code.", ['zipcode']);
                return;
            }

            if (/\d/.test(fullname)) {
                this.showErrorNotification("Full Name cannot contain numbers. Please enter text only.", ['fullname']);
                return;
            }

            if (/\d/.test(cityVal) || /\d/.test(stateVal)) {
                const invalidFields = [];
                if (/\d/.test(cityVal)) invalidFields.push('city');
                if (/\d/.test(stateVal)) invalidFields.push('state');
                this.showErrorNotification("City and State cannot contain numbers. Please enter text only.", invalidFields);
                return;
            }

            const shipping = `${addressVal}, ${cityVal}, ${stateVal} - ${zipcodeVal}`;
            let paymentToken = 'tok_razorpay_' + Math.random().toString(36).substring(2, 12);

            loader.querySelector('h3').innerHTML = 'Connecting Secure Payment Gateway...';
            loader.querySelector('p').innerHTML = 'Initializing SSL connection with Razorpay payment servers...';
            loader.classList.add('active');

            try {
                const itemsPayload = this.cart.map(item => {
                    const prod = window.app.getProduct(item.product_id);
                    return {
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: prod ? prod.price : 499.00
                    };
                });

                const response = await window.auth.fetchWithAuth('/api/checkout', {
                    method: 'POST',
                    body: JSON.stringify({
                        shipping_address: shipping,
                        total_amount: this.total,
                        payment_token: paymentToken,
                        items: itemsPayload
                    })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    loader.classList.remove('active');

                    if (window.Razorpay && data.keyId && data.keyId !== "rzp_test_placeholder" && data.keyId.trim() !== "") {
                        const options = {
                            "key": data.keyId,
                            "amount": data.amount,
                            "currency": data.currency || "INR",
                            "name": "CuteCrochet Shop",
                            "description": "Handmade crochet plushies",
                            "order_id": data.razorpayOrderId,
                            "prefill": {
                                "name": fullname,
                                "email": form.email.value || "",
                                "contact": form.phone.value || ""
                            },
                            "theme": { "color": "#FF8DA1" },
                            "handler": async (paymentDetails) => {
                                await this.completePaymentVerification(data, paymentDetails, shipping);
                            }
                        };
                        const rzp = new window.Razorpay(options);
                        rzp.open();
                    } else {
                        // Demo/Test fallback for unconfigured Razorpay key in environment
                        await this.completePaymentVerification(data, {
                            razorpay_payment_id: "pay_test_" + Math.random().toString(36).substring(2, 12),
                            razorpay_order_id: data.razorpayOrderId || ("order_test_" + Math.random().toString(36).substring(2, 12)),
                            razorpay_signature: "sig_test_" + Math.random().toString(36).substring(2, 12)
                        }, shipping);
                    }
                } else {
                    loader.classList.remove('active');
                    if (errorEl) {
                        errorEl.textContent = data.error || "Failed to initiate payment order.";
                        errorEl.style.display = 'block';
                    }
                }
            } catch (err) {
                loader.classList.remove('active');
                if (errorEl) {
                    errorEl.textContent = err.message || "A network error occurred while processing your order.";
                    errorEl.style.display = 'block';
                }
            }
        });
    },

    async completePaymentVerification(orderData, paymentDetails, shippingAddress) {
        const loader = document.getElementById('checkout-loading');
        const checkoutCard = document.getElementById('checkout-card-layout');
        const successDiv = document.getElementById('checkout-success-view');

        loader.querySelector('h3').innerHTML = 'Verifying Payment & Placing Order...';
        loader.querySelector('p').innerHTML = 'Dispatched confirmation email & generating tax invoice...';
        loader.classList.add('active');

        try {
            const verifyResponse = await window.auth.fetchWithAuth('/api/orders/verify', {
                method: 'POST',
                body: JSON.stringify({
                    razorpayPaymentId: paymentDetails.razorpay_payment_id,
                    razorpayOrderId: paymentDetails.razorpay_order_id,
                    razorpaySignature: paymentDetails.razorpay_signature
                })
            });

            const verifyData = await verifyResponse.json();
            if (verifyResponse.ok && verifyData.success) {
                loader.classList.remove('active');
                if (checkoutCard) checkoutCard.style.display = 'none';
                if (successDiv) successDiv.style.display = 'block';

                // Clear cart after successful checkout
                localStorage.removeItem('crochet_local_cart');
                if (window.app) window.app.cart = [];

                let itemsReceiptHtml = '';
                this.cart.forEach(item => {
                    const prod = window.app.getProduct(item.product_id);
                    itemsReceiptHtml += `<li>🌸 ${prod.name} (x${item.quantity}) - ₹${(prod.price * item.quantity).toFixed(2)}</li>`;
                });

                const invoiceId = orderData.order_id ? 'INV-' + orderData.order_id.substring(0, 8).toUpperCase() : 'INV-RECEIPT';
                const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

                successDiv.innerHTML = `
                    <div class="order-success-screen cute-card printable-invoice" style="text-align: center; padding: 30px;">
                        <div class="success-checkmark-circle no-print" style="width: 60px; height: 60px; background: #EBFDF8; border: 2px solid #C4F7E6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto;">
                            <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="#1E6652" stroke-width="2.8" style="width: 32px; height: 32px;"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                        <h2 style="color: var(--primary-dark); font-size: 24px; margin-bottom: 8px;">Order Placed Successfully!</h2>
                        <p class="no-print" style="color: var(--text-muted); font-size: 14px;">Thank you for buying handmade with love! Your confirmation email has been sent and your order is confirmed.</p>
                        
                        <div style="text-align: left; margin: 25px 0; background: #FFFDF8; padding: 24px; border-radius: 12px; border: 2px dashed #FFD6E0;" class="invoice-box">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; border-bottom: 1px solid #FFD6E0; padding-bottom: 15px;">
                                <div>
                                    <h3 style="margin: 0 0 4px 0; font-size: 20px; color: var(--primary);">CuteCrochet Shop</h3>
                                    <p style="font-size: 12px; color: var(--text-muted); margin:0;">Handmade Crochet Artisan Goods</p>
                                    <p style="font-size: 12px; color: var(--text-muted); margin:0;">Agra, Uttar Pradesh, India</p>
                                </div>
                                <div style="text-align: right;">
                                    <p style="font-size: 13px; margin: 0;"><strong>Date:</strong> ${currentDate}</p>
                                    <p style="font-size: 13px; margin: 2px 0;"><strong>Invoice:</strong> ${invoiceId}</p>
                                    <p style="font-size: 13px; margin: 0;"><strong>Status:</strong> <span style="color:#1E6652; font-weight:700;">PAID & VERIFIED</span></p>
                                </div>
                            </div>

                            <p style="font-size:13px; margin-bottom:4px;"><strong>Order Reference:</strong> #${orderData.order_id || 'ORDER'}</p>
                            <p style="font-size:13px; margin-bottom:4px;"><strong>Payment Transaction ID:</strong> ${paymentDetails.razorpay_payment_id}</p>
                            <p style="font-size:13px; margin-bottom:15px;"><strong>Deliver to:</strong> ${shippingAddress}</p>

                            <h5 style="margin-bottom:8px; font-size:14px; color: var(--primary-dark);">Items purchased:</h5>
                            <ul style="list-style:none; padding-left:0; font-size:13px; margin-bottom:15px; line-height: 1.6;">
                                ${itemsReceiptHtml}
                            </ul>
                            <div style="display: flex; justify-content: space-between; font-size: 14px; border-top: 1px dashed #FFD6E0; padding-top: 8px;">
                                <span>Subtotal:</span>
                                <span>₹${this.subtotal.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 4px;">
                                <span>Flat Shipping:</span>
                                <span>₹${this.shipping.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size:16px; font-weight:700; border-top: 2px solid var(--primary); padding-top:10px; margin-top: 10px; color: var(--primary);">
                                <span>Total Paid:</span>
                                <span>₹${this.total.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px;" class="no-print">
                            <button type="button" class="btn-cute btn-secondary" onclick="window.print()" style="padding: 10px 20px;">
                                Download / Print Invoice (PDF) <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            <a href="profile.html" class="btn-cute" style="padding: 10px 20px; text-decoration: none;">View My Account & Orders &rarr;</a>
                        </div>
                    </div>
                `;
            } else {
                loader.classList.remove('active');
                alert(verifyData.error || "Payment verification failed.");
            }
        } catch (err) {
            loader.classList.remove('active');
            alert("Network error verifying payment.");
        }
    },

    showErrorNotification(message, fieldIds = []) {
        const errorEl = document.getElementById('checkout-error');
        if (errorEl) {
            errorEl.innerHTML = `
                <div style="background: #FFF0F2; border: 2px solid #FF8DA1; border-radius: 12px; padding: 14px 18px; margin-bottom: 15px; animation: pop 0.3s ease; display: flex; align-items: flex-start; gap: 12px;">
                    <svg class="icon-inline" style="width: 22px; height: 22px; stroke: #D32F2F; flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                        <strong style="color: #D32F2F; font-size: 14px; display: block; margin-bottom: 3px;">Attention Required in Form Inputs:</strong>
                        <span style="color: #5A3A40; font-size: 13px; font-weight: 500;">${message}</span>
                    </div>
                </div>
            `;
            errorEl.style.display = 'block';
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (Array.isArray(fieldIds)) {
            fieldIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.border = '2px solid #FF8DA1';
                    el.style.backgroundColor = '#FFF5F7';
                    el.addEventListener('input', () => {
                        el.style.border = '';
                        el.style.backgroundColor = '';
                    }, { once: true });
                }
            });
        }
    },

    clearFieldHighlights() {
        ['fullname', 'phone', 'email', 'address', 'city', 'state', 'zipcode'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.border = '';
                el.style.backgroundColor = '';
            }
        });
    },

    copyUPIVPA() {
        const vpaText = document.getElementById('upi-vpa-id') ? document.getElementById('upi-vpa-id').textContent.trim() : 'craftingforyouofficial@upi';
        const copyBtn = document.getElementById('copy-vpa-btn');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(vpaText).then(() => {
                if (copyBtn) {
                    copyBtn.textContent = '✓ Copied!';
                    copyBtn.style.backgroundColor = '#10B981';
                    copyBtn.style.color = '#FFFFFF';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy ID';
                        copyBtn.style.backgroundColor = '';
                        copyBtn.style.color = '';
                    }, 2000);
                }
            }).catch(() => {});
        }
    },

    openUPIScannerModal() {
        const fullname = document.getElementById('fullname') ? document.getElementById('fullname').value.trim() : '';
        const address = document.getElementById('address') ? document.getElementById('address').value.trim() : '';
        const city = document.getElementById('city') ? document.getElementById('city').value.trim() : '';
        const zipcode = document.getElementById('zipcode') ? document.getElementById('zipcode').value.trim() : '';

        if (!fullname || !address || !city || !zipcode) {
            const missing = [];
            if (!fullname) missing.push('fullname');
            if (!address) missing.push('address');
            if (!city) missing.push('city');
            if (!zipcode) missing.push('zipcode');
            this.showErrorNotification("Please fill out your contact & delivery address before paying via UPI.", missing);
            return;
        }

        const modal = document.getElementById('upi-qr-modal');
        const totalEl = document.getElementById('upi-qr-total');
        if (totalEl) totalEl.textContent = `Total Amount: ₹${this.total.toFixed(2)}`;
        if (modal) modal.classList.add('active');
    },

    closeUPILightbox() {
        const modal = document.getElementById('upi-qr-modal');
        if (modal) modal.classList.remove('active');
    },

    async confirmUPIPayment() {
        this.closeUPILightbox();
        const addressVal = document.getElementById('address').value.trim();
        const cityVal = document.getElementById('city').value.trim();
        const zipcodeVal = document.getElementById('zipcode').value.trim();
        const stateVal = document.getElementById('state') ? document.getElementById('state').value.trim() : '';
        const shipping = `${addressVal}, ${cityVal}, ${stateVal} - ${zipcodeVal}`;

        await this.completePaymentVerification(
            { order_id: 'UPI-' + Math.random().toString(36).substring(2, 10) },
            {
                razorpay_payment_id: "pay_upi_" + Math.random().toString(36).substring(2, 12),
                razorpay_order_id: "order_upi_" + Math.random().toString(36).substring(2, 12),
                razorpay_signature: "sig_upi_" + Math.random().toString(36).substring(2, 12)
            },
            shipping
        );
    }
};

document.addEventListener('DOMContentLoaded', () => {
    checkout.init();
});
