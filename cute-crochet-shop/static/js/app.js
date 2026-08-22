// Core Shop Logic for Cute Crochet Shop

const PRODUCTS = {
    'panda': {
        id: 'panda',
        name: 'Panda Crochet Keychain',
        price: 799.00,
        description: 'Super round and squishy panda keychain with rosy cheeks. Made with soft velvet yarn.',
        images: ['assets/panda_keychain_1.jpg', 'assets/panda_keychain_2.jpg']
    },
    'brown-bear': {
        id: 'brown-bear',
        name: 'Teddy Bear Plushie (Brown)',
        price: 1299.00,
        description: 'Classic chocolate brown teddy bear plushie wearing a cute white bow ribbon.',
        images: ['assets/bears_group.jpg']
    },
    'white-bear': {
        id: 'white-bear',
        name: 'Teddy Bear Plushie (White)',
        price: 1299.00,
        description: 'Dreamy vanilla white teddy bear plushie with adorable hand-stitched details.',
        images: ['assets/bears_group.jpg']
    },
    'pink-bear': {
        id: 'pink-bear',
        name: 'Teddy Bear Plushie (Pink)',
        price: 1299.00,
        description: 'Sweet pastel pink teddy bear plushie, ultra-soft and perfect for comforting hugs.',
        images: ['assets/bears_group.jpg']
    },
    'beige-bear': {
        id: 'beige-bear',
        name: 'Teddy Bear Plushie (Beige)',
        price: 1299.00,
        description: 'Warm sandy beige teddy bear plushie, hand-crocheted with premium fluffy yarn.',
        images: ['assets/bears_group.jpg']
    },
    'penguin': {
        id: 'penguin',
        name: 'Mini Penguin Keychain',
        price: 599.00,
        description: 'Tiny penguin companion keychain featuring custom knit details and cute webbed feet.',
        images: ['assets/bears_group.jpg']
    },
    'tulips': {
        id: 'tulips',
        name: 'Double Tulip Keychains',
        price: 499.00,
        description: 'A matching pair of pastel pink and purple crochet tulip flower keychains.',
        images: ['assets/bears_group.jpg']
    },
    'heart': {
        id: 'heart',
        name: 'Crochet Heart Keychain',
        price: 299.00,
        description: 'A cozy pink puffy heart keychain to remind you of warm handmade love.',
        images: ['assets/bears_group.jpg']
    }
};

const app = {
    cart: [],

    init() {
        this.loadCart();
        this.renderProductGrid();
        this.setupEventListeners();
        this.updateCartBadge();
    },

    // Cart Management
    async loadCart() {
        // Load cart directly from localStorage (lightweight client model)
        const localCartStr = localStorage.getItem('crochet_local_cart');
        try {
            this.cart = localCartStr ? JSON.parse(localCartStr) : [];
            if (!Array.isArray(this.cart)) {
                this.cart = [];
            }
        } catch (e) {
            console.error("Error parsing cart JSON from localStorage:", e);
            this.cart = [];
        }
        this.updateCartBadge();
        
        if (document.getElementById('cart-container')) {
            this.renderCartPage();
        }
    },

    async saveCartItem(productId, quantity, isUpdate = false) {
        // Manage local cart in localStorage
        const existingIdx = this.cart.findIndex(i => i.product_id === productId);
        if (existingIdx > -1) {
            if (quantity <= 0) {
                this.cart.splice(existingIdx, 1);
            } else {
                if (isUpdate) {
                    this.cart[existingIdx].quantity = quantity;
                } else {
                    this.cart[existingIdx].quantity += quantity;
                }
            }
        } else if (quantity > 0) {
            this.cart.push({ product_id: productId, quantity: quantity });
        }
        
        localStorage.setItem('crochet_local_cart', JSON.stringify(this.cart));
        this.updateCartBadge();
        
        if (window.location.pathname.endsWith('cart.html') || window.location.pathname.endsWith('cart')) {
            this.renderCartPage();
        }
    },

    updateCartBadge() {
        const badge = document.querySelector('.cart-badge');
        if (!badge) return;
        
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    addToCart(productId, quantity = 1) {
        this.saveCartItem(productId, quantity, false);
        
        // Toast animation
        this.showToast(`Added ${PRODUCTS[productId].name} to your cart!`);
    },

    // UI Toast Notification
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.right = '30px';
        toast.style.background = 'var(--primary)';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = 'var(--border-radius-lg)';
        toast.style.boxShadow = 'var(--shadow-bubbly)';
        toast.style.fontFamily = 'var(--font-heading)';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '500';
        toast.style.animation = 'pop 0.3s ease';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fade-in 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    // Render Product Catalog
    renderProductGrid() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        Object.values(PRODUCTS).forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Image Slider Container
            const sliderHtml = this.createSliderHtml(prod);
            
            card.innerHTML = `
                ${sliderHtml}
                <div class="product-info">
                    <h3 class="product-title">${prod.name}</h3>
                    <p class="product-description">${prod.description}</p>
                    <div class="product-bottom">
                        <span class="product-price">₹${prod.price.toFixed(2)}</span>
                        <button class="btn-add-cart" onclick="app.addToCart('${prod.id}')"><svg class="icon-inline" style="stroke: var(--white);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="20" r="1.5" class="icon-filled"/><circle cx="18" cy="20" r="1.5" class="icon-filled"/><path d="M3 3h2l2.5 10a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5l1.5-7H6.5"/></svg></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    createSliderHtml(prod) {
        if (prod.images.length === 1) {
            return `
                <div class="product-image-slider" onclick="app.openLightbox('${prod.images[0]}')">
                    <img src="${prod.images[0]}" alt="${prod.name}">
                </div>
            `;
        }
        
        // Multi-image slider (e.g. panda)
        let slidesHtml = '';
        prod.images.forEach((img, idx) => {
            slidesHtml += `<img src="${img}" alt="${prod.name}" class="slide-img" style="display: ${idx === 0 ? 'block' : 'none'}; width:100%; height:100%;">`;
        });
        
        return `
            <div class="product-image-slider" id="slider-${prod.id}">
                ${slidesHtml}
                <button class="slider-arrow left" onclick="event.stopPropagation(); app.prevSlide('${prod.id}')">‹</button>
                <button class="slider-arrow right" onclick="event.stopPropagation(); app.nextSlide('${prod.id}')">›</button>
                <div onclick="app.openLightboxForSlider('${prod.id}')" style="position:absolute; top:0; left:0; right:0; bottom:0; z-index:1; cursor:zoom-in;"></div>
            </div>
        `;
    },

    // Slider Controls
    currentSlideIdx: {},
    prevSlide(prodId) {
        const prod = PRODUCTS[prodId];
        if (!this.currentSlideIdx[prodId]) this.currentSlideIdx[prodId] = 0;
        
        const oldIdx = this.currentSlideIdx[prodId];
        this.currentSlideIdx[prodId] = (this.currentSlideIdx[prodId] - 1 + prod.images.length) % prod.images.length;
        
        this.updateSliderUI(prodId, oldIdx, this.currentSlideIdx[prodId]);
    },

    nextSlide(prodId) {
        const prod = PRODUCTS[prodId];
        if (!this.currentSlideIdx[prodId]) this.currentSlideIdx[prodId] = 0;
        
        const oldIdx = this.currentSlideIdx[prodId];
        this.currentSlideIdx[prodId] = (this.currentSlideIdx[prodId] + 1) % prod.images.length;
        
        this.updateSliderUI(prodId, oldIdx, this.currentSlideIdx[prodId]);
    },

    updateSliderUI(prodId, oldIdx, newIdx) {
        const slider = document.getElementById(`slider-${prodId}`);
        if (!slider) return;
        const images = slider.querySelectorAll('.slide-img');
        images[oldIdx].style.display = 'none';
        images[newIdx].style.display = 'block';
    },

    // Lightbox Modal
    openLightbox(imageSrc) {
        const lightbox = document.getElementById('lightbox-modal');
        const lightboxImg = document.getElementById('lightbox-img');
        if (!lightbox || !lightboxImg) return;
        
        lightboxImg.src = imageSrc;
        lightbox.classList.add('active');
    },

    openLightboxForSlider(prodId) {
        const idx = this.currentSlideIdx[prodId] || 0;
        const imageSrc = PRODUCTS[prodId].images[idx];
        this.openLightbox(imageSrc);
    },

    closeLightbox() {
        const lightbox = document.getElementById('lightbox-modal');
        if (lightbox) lightbox.classList.remove('active');
    },

    // Interactive Hotspots (Bears group image overlay)
    setupHotspots() {
        const spots = document.querySelectorAll('.hotspot');
        const tooltip = document.getElementById('hotspot-tooltip');
        if (!spots.length || !tooltip) return;
        
        spots.forEach(spot => {
            const prodId = spot.dataset.product;
            const product = PRODUCTS[prodId];
            
            if (!product) return;
            
            spot.addEventListener('mouseenter', (e) => {
                tooltip.querySelector('h4').textContent = product.name;
                tooltip.querySelector('p').textContent = `₹${product.price.toFixed(2)}`;
                tooltip.querySelector('button').setAttribute('onclick', `app.addToCart('${product.id}')`);
                
                const rect = spot.getBoundingClientRect();
                const containerRect = spot.parentElement.getBoundingClientRect();
                
                // Position tooltip above hotspot
                const leftPos = rect.left - containerRect.left + (rect.width / 2) - 90; // center tooltip
                const topPos = rect.top - containerRect.top - 120; // place above
                
                tooltip.style.left = `${leftPos}px`;
                tooltip.style.top = `${topPos}px`;
                tooltip.classList.add('active');
            });
            
            spot.addEventListener('mouseleave', (e) => {
                // Keep tooltip open brief moment to allow clicking
                setTimeout(() => {
                    if (!tooltip.matches(':hover')) {
                        tooltip.classList.remove('active');
                    }
                }, 100);
            });
        });
        
        tooltip.addEventListener('mouseleave', () => {
            tooltip.classList.remove('active');
        });
    },

    // Render Cart Page Items
    renderCartPage() {
        const container = document.getElementById('cart-container');
        if (!container) return;
        
        const isAuthenticated = window.auth && window.auth.isAuthenticated();
        
        if (!isAuthenticated) {
            // Cart-to-login wall
            container.innerHTML = `
                <div class="cart-lock-screen cute-card">
                    <div class="cart-lock-icon" style="color: var(--primary);"><svg class="icon-inline" style="width: 50px; height: 50px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <svg class="icon-inline" style="width: 50px; height: 50px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="2.5" class="icon-filled"/><circle cx="12" cy="6.5" r="2.5"/><circle cx="17" cy="10" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/><circle cx="8.5" cy="16" r="2.5"/><circle cx="7" cy="10" r="2.5"/></svg></div>
                    <h2>Secure Login Required</h2>
                    <p>To view your cart items, edit details, or proceed to checkout, you must log in securely. Setting up an account takes less than a minute!</p>
                    <a href="/login.html?redirect=cart.html" class="btn-cute">Sign In / Register <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></a>
                </div>
            `;
            return;
        }
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="cart-lock-screen cute-card">
                    <div class="cart-lock-icon" style="color: var(--primary);"><svg class="icon-inline" style="width: 60px; height: 60px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="20" r="1.5" class="icon-filled"/><circle cx="18" cy="20" r="1.5" class="icon-filled"/><path d="M3 3h2l2.5 10a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5l1.5-7H6.5"/></svg></div>
                    <h2>Your basket is empty!</h2>
                    <p>Go look at some cute plushies and add them to your cart. They are waiting for a loving home!</p>
                    <a href="/index.html" class="btn-cute">Browse Products <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="12" cy="13" r="6"/><circle cx="9.5" cy="11.5" r="0.6" fill="currentColor"/><circle cx="14.5" cy="11.5" r="0.6" fill="currentColor"/><path d="M10 15a2 2 0 0 0 4 0h-4z"/></svg></a>
                </div>
            `;
            return;
        }
        
        // Render authenticated cart list
        let itemsHtml = '';
        let subtotal = 0;
        
        this.cart.forEach(item => {
            const product = PRODUCTS[item.product_id];
            if (!product) return;
            
            const lineTotal = product.price * item.quantity;
            subtotal += lineTotal;
            
            itemsHtml += `
                <div class="cart-item-row">
                    <img src="${product.images[0]}" alt="${product.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${product.name}</h3>
                        <p class="cart-item-price">₹${product.price.toFixed(2)}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="app.saveCartItem('${item.product_id}', ${item.quantity - 1}, true)">-</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn" onclick="app.saveCartItem('${item.product_id}', ${item.quantity + 1}, true)">+</button>
                    </div>
                    <div style="font-family: var(--font-heading); font-weight:600; font-size:16px; margin: 0 10px; width:70px; text-align:right;">
                        ₹${lineTotal.toFixed(2)}
                    </div>
                    <button class="cart-item-remove-btn" onclick="app.saveCartItem('${item.product_id}', 0, true)"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M19 6v14c0 2-2 2-2 2H7c0 0-2 0-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                </div>
            `;
        });
        
        const shipping = 99.00;
        const total = subtotal + shipping;
        
        container.innerHTML = `
            <div class="cart-layout">
                <div class="cart-items-list">
                    ${itemsHtml}
                </div>
                <div class="cute-card cart-summary-card">
                    <h2>Order Summary</h2>
                    <div class="cart-summary-line" style="margin-top: 20px;">
                        <span>Items Subtotal:</span>
                        <span style="font-weight:600;">₹${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="cart-summary-line">
                        <span>Cozy Shipping:</span>
                        <span style="font-weight:600;">₹${shipping.toFixed(2)}</span>
                    </div>
                    <div class="cart-summary-total">
                        <span>Total:</span>
                        <span>₹${total.toFixed(2)}</span>
                    </div>
                    <a href="/checkout.html" class="btn-cute" style="width: 100%; text-align: center; margin-top: 25px;">Proceed to Checkout <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></a>
                </div>
            </div>
        `;
    },

    // Contact Form Logic
    async handleContactSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const name = form.name.value;
        const email = form.email.value;
        const message = form.message.value;
        
        const errorEl = document.getElementById('contact-error');
        const successEl = document.getElementById('contact-success');
        
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
            
            const data = await response.json();
            if (response.ok) {
                successEl.innerHTML = "Your cute message was sent! We'll reply within 24 hours. <svg class='icon-inline' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2'><circle cx='12' cy='12' r='2.5' class='icon-filled'/><circle cx='12' cy='6.5' r='2.5'/><circle cx='17' cy='10' r='2.5'/><circle cx='15.5' cy='16' r='2.5'/><circle cx='8.5' cy='16' r='2.5'/><circle cx='7' cy='10' r='2.5'></svg>";
                successEl.style.display = 'block';
                form.reset();
            } else {
                errorEl.textContent = data.error || "Failed to send message.";
                errorEl.style.display = 'block';
            }
        } catch (err) {
            errorEl.textContent = "A network error occurred. Please try again.";
            errorEl.style.display = 'block';
        }
    },

    setupEventListeners() {
        // Lightbox close on click outside
        const lightbox = document.getElementById('lightbox-modal');
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    this.closeLightbox();
                }
            });
        }
        
        // Contact form submit
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', this.handleContactSubmit);
        }
        
        // Initialize Hotspots if present
        this.setupHotspots();
    }
};

app.PRODUCTS = PRODUCTS;

// Export to window
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
