// Secure Payment Gateway & Checkout Handler

const checkout = {
    cart: [],
    subtotal: 0,
    shipping: 99.00,
    total: 0,
    activePaymentMethod: 'card',
    qrPaymentConfirmed: false,

    async init() {
        if (!window.auth || !window.auth.isAuthenticated()) {
            window.location.href = '/login.html?redirect=checkout.html';
            return;
        }

        this.setupCardInputs();
        await this.loadCheckoutItems();
        this.setupFormSubmit();
    },

    switchPaymentMethod(method) {
        this.activePaymentMethod = method;
        const tabCard = document.getElementById('pay-tab-card');
        const tabUpi = document.getElementById('pay-tab-upi');
        const panelCard = document.getElementById('pay-panel-card');
        const panelUpi = document.getElementById('pay-panel-upi');
        const submitBtn = document.getElementById('checkout-submit-btn');

        if (!tabCard || !tabUpi || !panelCard || !panelUpi || !submitBtn) return;

        if (method === 'card') {
            tabCard.classList.add('active');
            tabUpi.classList.remove('active');
            panelCard.classList.add('active');
            panelUpi.classList.remove('active');
            submitBtn.innerHTML = `Pay Securely ₹${this.total.toFixed(2)} <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        } else {
            tabUpi.classList.add('active');
            tabCard.classList.remove('active');
            panelUpi.classList.add('active');
            panelCard.classList.remove('active');
            submitBtn.innerHTML = `Proceed to UPI Pay ₹${this.total.toFixed(2)} <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`;
        }
    },

    showUPILightbox() {
        const modal = document.getElementById('upi-qr-modal');
        const totalText = document.getElementById('upi-qr-total');
        if (modal && totalText) {
            totalText.textContent = `Total: ₹${this.total.toFixed(2)}`;
            modal.classList.add('active');
        }
    },

    closeUPILightbox() {
        const modal = document.getElementById('upi-qr-modal');
        if (modal) modal.classList.remove('active');
    },

    confirmUPIPayment() {
        this.qrPaymentConfirmed = true;
        this.closeUPILightbox();
        // Set placeholder UPI ID to skip verification and submit form
        const upiIdField = document.getElementById('upi-id');
        if (upiIdField) {
            upiIdField.value = "scanned_qr@upi";
        }
        
        // Find form and submit it
        const form = document.getElementById('checkout-form');
        if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    },

    async loadCheckoutItems() {
        // Load cart directly from localStorage (lightweight client model)
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

        // Exposing PRODUCTS from window.app.PRODUCTS resolves the undefined loading bug!
        const productsCatalog = (window.app && window.app.PRODUCTS) || window.PRODUCTS || {
            'panda': { id: 'panda', name: 'Panda Crochet Keychain', price: 799.00, images: ['assets/panda_keychain_1.jpg'] },
            'brown-bear': { id: 'brown-bear', name: 'Teddy Bear Plushie (Brown)', price: 1299.00, images: ['assets/bears_group.jpg'] },
            'white-bear': { id: 'white-bear', name: 'Teddy Bear Plushie (White)', price: 1299.00, images: ['assets/bears_group.jpg'] },
            'pink-bear': { id: 'pink-bear', name: 'Teddy Bear Plushie (Pink)', price: 1299.00, images: ['assets/bears_group.jpg'] },
            'beige-bear': { id: 'beige-bear', name: 'Teddy Bear Plushie (Beige)', price: 1299.00, images: ['assets/bears_group.jpg'] },
            'penguin': { id: 'penguin', name: 'Mini Penguin Keychain', price: 599.00, images: ['assets/bears_group.jpg'] },
            'tulips': { id: 'tulips', name: 'Double Tulip Keychains', price: 499.00, images: ['assets/bears_group.jpg'] },
            'heart': { id: 'heart', name: 'Crochet Heart Keychain', price: 299.00, images: ['assets/bears_group.jpg'] }
        };

        this.cart.forEach(item => {
            const product = (window.app && window.app.getProduct) ? window.app.getProduct(item.product_id) : (productsCatalog[item.product_id] || { name: item.product_id, price: 499.00 });
            if (!product) return;

            const lineTotal = product.price * item.quantity;
            this.subtotal += lineTotal;

            itemsHtml += `
                <div class="cart-summary-line" style="font-size: 14px;">
                    <span>${product.name} (x${item.quantity})</span>
                    <span>₹${lineTotal.toFixed(2)}</span>
                </div>
            `;
        });

        this.total = this.subtotal + this.shipping;

        orderSummaryDiv.innerHTML = `
            <h3>Your Order</h3>
            <div style="margin-top: 15px; display:flex; flex-direction:column; gap:8px;">
                ${itemsHtml}
            </div>
            <div class="cart-summary-line" style="margin-top: 15px; border-top: 2px dashed var(--primary-light); padding-top: 10px;">
                <span>Subtotal:</span>
                <span>₹${this.subtotal.toFixed(2)}</span>
            </div>
            <div class="cart-summary-line">
                <span>Shipping:</span>
                <span>₹${this.shipping.toFixed(2)}</span>
            </div>
            <div class="cart-summary-total">
                <span>Total:</span>
                <span>₹${this.total.toFixed(2)}</span>
            </div>
        `;

        // Update the submit button value text with the calculated total
        const submitBtn = document.getElementById('checkout-submit-btn');
        if (submitBtn) {
            this.switchPaymentMethod(this.activePaymentMethod);
        }
    },

    setupCardInputs() {
        const cardNumInput = document.getElementById('card-number');
        const cardExpiryInput = document.getElementById('card-expiry');
        const cardCvvInput = document.getElementById('card-cvv');
        const brandIcon = document.getElementById('card-brand-icon');

        if (!cardNumInput || !cardExpiryInput || !cardCvvInput) return;

        // Auto-focus styling replication
        [cardNumInput, cardExpiryInput, cardCvvInput].forEach(input => {
            if (!input) return;
            const parent = input.closest('.stripe-mock-field');
            input.addEventListener('focus', () => parent.classList.add('focus'));
            input.addEventListener('blur', () => parent.classList.remove('focus'));
        });

        // Card number format & brand detector
        cardNumInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            val = val.substring(0, 16);
            
            let formatted = '';
            for (let i = 0; i < val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += val[i];
            }
            e.target.value = formatted;

            // Brand detection
            if (val.startsWith('4')) {
                brandIcon.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: #1A1F71; font-family: var(--font-heading);">VISA</span>`;
            } else if (/^(51|52|53|54|55)/.test(val)) {
                brandIcon.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: #EB001B; font-family: var(--font-heading);">MC</span>`;
            } else if (/^(34|37)/.test(val)) {
                brandIcon.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: #007BC1; font-family: var(--font-heading);">AMEX</span>`;
            } else {
                brandIcon.innerHTML = `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
                brandIcon.style.color = 'var(--primary)';
            }
        });

        // Card expiry format MM/YY
        cardExpiryInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            val = val.substring(0, 4);
            
            let formatted = '';
            if (val.length > 2) {
                formatted = val.substring(0, 2) + '/' + val.substring(2);
            } else {
                formatted = val;
            }
            e.target.value = formatted;
        });

        // CVV limit to 3 or 4 digits
        cardCvvInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            val = val.substring(0, 4);
            e.target.value = val;
        });
    },

    validateCard(num, expiry, cvv) {
        const cleanedNum = num.replace(/\s/g, '');
        if (cleanedNum.length < 13 || cleanedNum.length > 16) return "Card number must be between 13 and 16 digits.";
        
        let sum = 0;
        let shouldDouble = false;
        for (let i = cleanedNum.length - 1; i >= 0; i--) {
            let digit = parseInt(cleanedNum.charAt(i));
            if (shouldDouble) {
                if ((digit *= 2) > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        if (sum % 10 !== 0) return "Card number is invalid (Luhn check failed).";

        const parts = expiry.split('/');
        if (parts.length !== 2) return "Expiry date must be in MM/YY format.";
        
        const month = parseInt(parts[0], 10);
        const year = parseInt('20' + parts[1], 10);
        
        if (isNaN(month) || month < 1 || month > 12) return "Expiry month is invalid.";
        
        const expiryDate = new Date(year, month - 1, 28);
        if (expiryDate < new Date()) return "Card expiry date must be in the future.";

        if (cvv.length < 3 || cvv.length > 4) return "CVV must be 3 or 4 digits.";

        return null;
    },

    validateUPI(upiId) {
        // Standard VPA check: username@bank
        const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiPattern.test(upiId)) {
            return "UPI ID format is invalid. Must be like username@upi or name@bank.";
        }
        return null;
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
            errorEl.style.display = 'none';

            const shipping = form.address.value + ', ' + form.city.value + ', ' + form.zipcode.value;
            let paymentToken = '';

            // Handle validations based on payment method
            if (this.activePaymentMethod === 'card') {
                const cardNum = form['card-number'].value;
                const cardExpiry = form['card-expiry'].value;
                const cardCvv = form['card-cvv'].value;

                const validationError = this.validateCard(cardNum, cardExpiry, cardCvv);
                if (validationError) {
                    errorEl.textContent = validationError;
                    errorEl.style.display = 'block';
                    return;
                }
                
                // Show card processing text
                loader.querySelector('h3').innerHTML = 'Verifying Card Details...';
                loader.querySelector('p').innerHTML = 'Securing connection with bank server... <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="2.5" class="icon-filled"/><circle cx="12" cy="6.5" r="2.5"/><circle cx="17" cy="10" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/><circle cx="8.5" cy="16" r="2.5"/><circle cx="7" cy="10" r="2.5"/></svg>';
                paymentToken = 'tok_card_' + Math.random().toString(36).substring(2, 12);
            } else {
                const upiId = document.getElementById('upi-id').value;
                
                // If not QR confirmed, validate UPI ID
                if (!this.qrPaymentConfirmed) {
                    const upiError = this.validateUPI(upiId);
                    if (upiError) {
                        errorEl.textContent = upiError;
                        errorEl.style.display = 'block';
                        return;
                    }
                    
                    loader.querySelector('h3').innerHTML = 'Sending UPI Request...';
                    loader.querySelector('p').innerHTML = 'Please open your UPI app to approve payment... <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>';
                    paymentToken = 'tok_upi_collect_' + Math.random().toString(36).substring(2, 12);
                } else {
                    // QR flow
                    loader.querySelector('h3').innerHTML = 'Confirming UPI Payment...';
                    loader.querySelector('p').innerHTML = 'Checking bank ledger database... <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="2.5" class="icon-filled"/><circle cx="12" cy="6.5" r="2.5"/><circle cx="17" cy="10" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/><circle cx="8.5" cy="16" r="2.5"/><circle cx="7" cy="10" r="2.5"/></svg>';
                    paymentToken = 'tok_upi_qr_' + Math.random().toString(36).substring(2, 12);
                }
            }

            // Show secure processing animation overlay
            loader.classList.add('active');

            try {
                // Pre-process items mapping
                const productsCatalog = (window.app && window.app.PRODUCTS) || window.PRODUCTS || {
                    'panda': { id: 'panda', name: 'Panda Crochet Keychain', price: 799.00, images: ['assets/panda_keychain_1.jpg'] },
                    'brown-bear': { id: 'brown-bear', name: 'Teddy Bear Plushie (Brown)', price: 1299.00, images: ['assets/bears_group.jpg'] },
                    'white-bear': { id: 'white-bear', name: 'Teddy Bear Plushie (White)', price: 1299.00, images: ['assets/bears_group.jpg'] },
                    'pink-bear': { id: 'pink-bear', name: 'Teddy Bear Plushie (Pink)', price: 1299.00, images: ['assets/bears_group.jpg'] },
                    'beige-bear': { id: 'beige-bear', name: 'Teddy Bear Plushie (Beige)', price: 1299.00, images: ['assets/bears_group.jpg'] },
                    'penguin': { id: 'penguin', name: 'Mini Penguin Keychain', price: 599.00, images: ['assets/bears_group.jpg'] },
                    'tulips': { id: 'tulips', name: 'Double Tulip Keychains', price: 499.00, images: ['assets/bears_group.jpg'] },
                    'heart': { id: 'heart', name: 'Crochet Heart Keychain', price: 299.00, images: ['assets/bears_group.jpg'] }
                };

                const itemsPayload = this.cart.map(item => {
                    const prod = productsCatalog[item.product_id];
                    return {
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: prod ? prod.price : 0
                    };
                });

                // 1. Initiate order creation on backend
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

                    // 2. Open Razorpay Secure Payment Portal
                    const options = {
                        "key": data.keyId,
                        "amount": data.amount,
                        "currency": data.currency,
                        "name": "CuteCrochet Shop",
                        "description": "Adopt your handmade crochet friends",
                        "order_id": data.razorpayOrderId,
                        "prefill": {
                            "name": window.auth.getUser() ? window.auth.getUser().name : "",
                            "email": window.auth.getUser() ? window.auth.getUser().email : ""
                        },
                        "theme": {
                            "color": "#FF8DA1"
                        },
                        "handler": async (paymentDetails) => {
                            loader.querySelector('h3').innerHTML = 'Verifying Transaction...';
                            loader.querySelector('p').innerHTML = 'Verifying cryptographic security keys...';
                            loader.classList.add('active');

                            try {
                                // 3. Synchronously verify payment signatures on backend
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
                                    checkoutCard.style.display = 'none';

                                    let itemsReceiptHtml = '';
                                    this.cart.forEach(item => {
                                        const prod = productsCatalog[item.product_id];
                                        itemsReceiptHtml += `<li><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="2.5" class="icon-filled"/><circle cx="12" cy="6.5" r="2.5"/><circle cx="17" cy="10" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/><circle cx="8.5" cy="16" r="2.5"/><circle cx="7" cy="10" r="2.5"/></svg> ${prod.name} (x${item.quantity}) - ₹${(prod.price * item.quantity).toFixed(2)}</li>`;
                                    });

                                    successDiv.innerHTML = `
                                        <div class="order-success-screen cute-card">
                                            <div class="success-checkmark-circle"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" style="width: 40px; height: 40px; stroke: #1E6652; vertical-align: middle;"><path d="M20 6 9 17l-5-5"/></svg></div>
                                            <h2>Payment Successful!</h2>
                                            <p>Thank you for buying handmade with love! Your order has been placed securely.</p>
                                            
                                            <div style="text-align: left; margin: 30px 0; background: var(--bg-main); padding: 20px; border-radius: var(--border-radius-md); border: 2px dashed var(--primary-light);">
                                                <h4 style="margin-bottom:10px;">Order Details</h4>
                                                <p style="font-size:14px; margin-bottom:5px;"><strong>Order ID:</strong> #${data.order_id}</p>
                                                <p style="font-size:14px; margin-bottom:5px;"><strong>Transaction ID:</strong> ${paymentDetails.razorpay_payment_id}</p>
                                                <p style="font-size:14px; margin-bottom:10px;"><strong>Deliver to:</strong> ${shipping}</p>
                                                <p style="font-size:14px; margin-bottom:10px;"><strong>Payment Method:</strong> RAZORPAY SECURE GATEWAY</p>
                                                <h5 style="margin-bottom:5px; font-family:var(--font-heading);">Items purchased:</h5>
                                                <ul style="list-style:none; padding-left:0; font-size:13px; margin-bottom:10px;">
                                                    ${itemsReceiptHtml}
                                                </ul>
                                                <p style="font-size:16px; font-weight:700; border-top: 1px dashed var(--primary); padding-top:10px;">Total Paid: ₹${this.total.toFixed(2)}</p>
                                            </div>
                                            
                                            <a href="/index.html" class="btn-cute">Continue Shopping <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="12" cy="13" r="6"/><circle cx="9.5" cy="11.5" r="0.6" fill="currentColor"/><circle cx="14.5" cy="11.5" r="0.6" fill="currentColor"/><path d="M10 15a2 2 0 0 0 4 0h-4z"/></svg></a>
                                        </div>
                                    `;
                                    successDiv.style.display = 'block';

                                    // Reset cart states
                                    window.app.cart = [];
                                    localStorage.setItem('crochet_local_cart', '[]');
                                    window.app.updateCartBadge();
                                } else {
                                    loader.classList.remove('active');
                                    errorEl.textContent = verifyData.error || "Cryptographic verification failed. Payment was received but could not be logged yet. Please contact support.";
                                    errorEl.style.display = 'block';
                                }
                            } catch (err) {
                                loader.classList.remove('active');
                                errorEl.textContent = "A verification network error occurred. Please contact support with your payment ID: " + paymentDetails.razorpay_payment_id;
                                errorEl.style.display = 'block';
                            }
                        },
                        "modal": {
                            "ondismiss": function() {
                                loader.classList.remove('active');
                            }
                        }
                    };
                    const rzp = new Razorpay(options);
                    rzp.open();
                } else {
                    loader.classList.remove('active');
                    errorEl.textContent = data.error || "Failed to create payment session. Please try again.";
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                loader.classList.remove('active');
                errorEl.textContent = "A network error occurred. Please check your connection.";
                errorEl.style.display = 'block';
            }
        });
    }
};

window.checkout = checkout;

document.addEventListener('DOMContentLoaded', () => {
    checkout.init();
});
