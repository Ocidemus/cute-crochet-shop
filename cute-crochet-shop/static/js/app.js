// Core Shop Logic for Cute Crochet Shop

const PRODUCTS = {
    'bears': {
        id: 'bears',
        name: 'Handcrafted Crochet Bears',
        price: 399.00,
        description: 'Custom handcrafted plush bears. Choose single, pair, or set of 3/4 in cute pastel colors.',
        images: ['assets/bears_colors.jpg', 'assets/bears_single.jpg', 'assets/bears_pair.jpg', 'assets/bears_set.jpg', 'assets/bears_1.jpg', 'assets/bears_2.jpg', 'assets/bears_3.jpg'],
        hasOptions: true,
        packOptions: [
            { label: 'Single Bear (₹399)', value: 'single', price: 399.00 },
            { label: 'Pair / 2 Bears (₹699)', value: 'pair', price: 699.00 },
            { label: 'Set of 3 (₹999)', value: 'set3', price: 999.00 },
            { label: 'Set of 4 (₹1249)', value: 'set4', price: 1249.00 }
        ],
        colorOptions: [
            { label: 'Chocolate Brown', value: 'brown' },
            { label: 'Vanilla White', value: 'white' },
            { label: 'Sandy Beige', value: 'beige' },
            { label: 'Pastel Pink', value: 'pink' }
        ]
    },
    'teddy': {
        id: 'teddy',
        name: 'Cozy Teddy Bear',
        price: 449.00,
        description: 'Super soft crochet teddy bear plushie wearing a cute ribbon.',
        images: ['assets/teddy_1.jpg', 'assets/teddy_2.jpg', 'assets/teddy_3.jpg', 'assets/teddy_4.jpg', 'assets/teddy_5.jpg'],
        hasOptions: true,
        packOptions: [
            { label: 'Single Teddy (₹449)', value: 'single', price: 449.00 },
            { label: 'Pair / 2 Teddies (₹799)', value: 'pair', price: 799.00 }
        ],
        colorOptions: [
            { label: 'Vanilla White', value: 'white' },
            { label: 'Chocolate Brown', value: 'brown' }
        ]
    },
    'cute': {
        id: 'cute',
        name: 'Little Duck holding Flower',
        price: 699.00,
        description: 'Cute white chick/duck holding a pink flower. Adorable handmade desk buddy featuring full photo gallery.',
        images: ['assets/cute_1.jpg', 'assets/cute_2.jpg', 'assets/cute_3.jpg', 'assets/cute_4.jpg']
    },
    'panda': {
        id: 'panda',
        name: 'Panda Crochet Keychain',
        price: 799.00,
        description: 'Super round and squishy panda keychain with rosy cheeks. Made with soft velvet yarn.',
        images: ['assets/panda_1.jpg', 'assets/panda_2.jpg', 'assets/panda_3.jpg', 'assets/panda_4.jpg', 'assets/panda_5.jpg']
    },
    'capybara': {
        id: 'capybara',
        name: 'Capybara Plushie Keychain',
        price: 899.00,
        description: 'Squishy brown capybara plushie keychain with closed happy eyes.',
        images: ['assets/capybara_1.jpg', 'assets/capybara_2.jpg', 'assets/capybara_3.jpg', 'assets/capybara_4.jpg']
    },
    'spiderman': {
        id: 'spiderman',
        name: 'Spiderman Crochet Keychain',
        price: 599.00,
        description: 'Handcrafted Spiderman hero crochet keychain with detailed mask pattern.',
        images: ['assets/spiderman_1.jpg', 'assets/spiderman_2.jpg', 'assets/spiderman_3.jpg', 'assets/spiderman_4.jpg']
    },
    'bow': {
        id: 'bow',
        name: 'Crochet Ribbon Bow Keychain',
        price: 349.00,
        description: 'Cozy handmade crochet ribbon bow keychains in aesthetic pastel colors.',
        images: ['assets/bow_1.jpg', 'assets/bow_2.jpg', 'assets/bow_3.jpg', 'assets/bow_4.jpg', 'assets/bow_5.jpg']
    },
    'penguin': {
        id: 'penguin',
        name: 'Mini Penguin Keychain',
        price: 699.00,
        description: 'Tiny penguin companion keychain featuring custom knit details and cute webbed feet.',
        images: ['assets/penguin_1.jpg', 'assets/penguin_2.jpg']
    },
    'flowers': {
        id: 'flowers',
        name: 'Handmade Crochet Flowers',
        price: 499.00,
        description: 'Everlasting crochet flower stems and keychains made with love.',
        images: ['assets/flowers_1.jpg', 'assets/flowers_2.jpg']
    },
    'hearts': {
        id: 'hearts',
        name: 'Puffy Crochet Heart Keychain',
        price: 299.00,
        description: 'A cozy puffy heart keychain to remind you of warm handmade love.',
        images: ['assets/hearts_1.jpg', 'assets/hearts_2.jpg', 'assets/hearts_3.jpg', 'assets/hearts_4.jpg']
    },
    'combo': {
        id: 'combo',
        name: 'Crochet Super Combo Bundle',
        price: 1199.00,
        description: 'Special discount bundle featuring a mix of our most popular crochet plushies.',
        images: ['assets/combo_1.jpg', 'assets/combo_2.jpg', 'assets/combo_3.jpg']
    },
    'bouquet': {
        id: 'bouquet',
        name: 'Handcrafted Flower Bouquet',
        price: 999.00,
        description: 'Gorgeous handmade crochet flower bouquet that never fades.',
        images: ['assets/bouquet_1.jpg']
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

    // Dynamic Product & Variant Resolver
    getProduct(id) {
        if (!id) return { name: 'Crochet Plushie', price: 499.00, images: ['assets/bears_colors.jpg'] };
        if (PRODUCTS[id]) return PRODUCTS[id];

        if (id === 'duck') return PRODUCTS['cute'];

        // Dynamic Bears variant lookup (e.g. bears-single-brown, bears-pair-pink)
        if (id.startsWith('bears-') || id === 'bears') {
            const parts = id.split('-');
            const pack = parts[1] || 'single';
            const color = parts[2] || 'brown';

            const packMap = {
                'single': { name: 'Single Bear', price: 399.00, img: 'assets/bears_single.jpg' },
                'pair': { name: 'Pair (2 Bears)', price: 699.00, img: 'assets/bears_pair.jpg' },
                'set3': { name: 'Set of 3 Bears', price: 999.00, img: 'assets/bears_set.jpg' },
                'set4': { name: 'Set of 4 Bears', price: 1249.00, img: 'assets/bears_set.jpg' }
            };
            const colorNames = {
                'brown': 'Brown', 'white': 'White', 'beige': 'Beige', 'pink': 'Pink'
            };

            const pInfo = packMap[pack] || packMap['single'];
            const colorName = colorNames[color] || 'Brown';

            return {
                id: id,
                name: `Handcrafted Crochet Bears (${pInfo.name} - ${colorName})`,
                price: pInfo.price,
                description: `Custom handcrafted plush bear set in ${colorName}.`,
                images: [pInfo.img, 'assets/bears_colors.jpg']
            };
        }

        // Dynamic Teddy variant lookup (e.g. teddy-single-white, teddy-pair-brown)
        if (id.startsWith('teddy-') || id === 'teddy') {
            const parts = id.split('-');
            const pack = parts[1] || 'single';
            const color = parts[2] || 'white';

            const packMap = {
                'single': { name: 'Single Teddy', price: 449.00, img: 'assets/teddy_1.jpg' },
                'pair': { name: 'Pair (2 Teddies)', price: 799.00, img: 'assets/teddy_3.jpg' }
            };
            const colorNames = {
                'white': 'White', 'brown': 'Brown'
            };

            const pInfo = packMap[pack] || packMap['single'];
            const colorName = colorNames[color] || 'White';

            return {
                id: id,
                name: `Cozy Teddy Bear (${pInfo.name} - ${colorName})`,
                price: pInfo.price,
                description: `Super soft crochet teddy bear in ${colorName}.`,
                images: [pInfo.img, 'assets/teddy_2.jpg']
            };
        }

        // Legacy mappings
        if (id === 'brown-bear') return { id: 'brown-bear', name: 'Teddy Bear Plushie (Brown)', price: 399.00, images: ['assets/bears_single.jpg'] };
        if (id === 'white-bear') return { id: 'white-bear', name: 'Teddy Bear Plushie (White)', price: 399.00, images: ['assets/bears_single.jpg'] };
        if (id === 'pink-bear') return { id: 'pink-bear', name: 'Teddy Bear Plushie (Pink)', price: 399.00, images: ['assets/bears_single.jpg'] };
        if (id === 'beige-bear') return { id: 'beige-bear', name: 'Teddy Bear Plushie (Beige)', price: 399.00, images: ['assets/bears_single.jpg'] };
        if (id === 'tulips') return { id: 'tulips', name: 'Handmade Crochet Flowers', price: 499.00, images: ['assets/flowers_1.jpg'] };
        if (id === 'heart') return { id: 'heart', name: 'Puffy Crochet Heart Keychain', price: 299.00, images: ['assets/hearts_1.jpg'] };

        return {
            id: id,
            name: 'Cute Crochet Plushie',
            price: 499.00,
            images: ['assets/bears_colors.jpg']
        };
    },

    // Cart Management
    async loadCart() {
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

    updateCardPrice(prodId) {
        const prod = PRODUCTS[prodId];
        if (!prod || !prod.hasOptions) return;
        
        const packSelect = document.getElementById(`pack-${prodId}`);
        const priceSpan = document.getElementById(`price-${prodId}`);
        if (!packSelect || !priceSpan) return;
        
        const selectedOpt = packSelect.options[packSelect.selectedIndex];
        const price = parseFloat(selectedOpt.dataset.price || prod.price);
        priceSpan.textContent = `₹${price.toFixed(2)}`;
    },

    addToCart(productId, quantity = 1) {
        let finalProductId = productId;
        const prodObj = PRODUCTS[productId];
        
        if (prodObj && prodObj.hasOptions) {
            const packSelect = document.getElementById(`pack-${productId}`);
            const colorSelect = document.getElementById(`color-${productId}`);
            const packVal = packSelect ? packSelect.value : 'single';
            const colorVal = colorSelect ? colorSelect.value : 'brown';
            finalProductId = `${productId}-${packVal}-${colorVal}`;
        }
        
        this.saveCartItem(finalProductId, quantity, false);
        
        const resolved = this.getProduct(finalProductId);
        this.showToast(`Added ${quantity}x ${resolved.name} to your cart!`);
    },

    cardQuantities: {},

    changeCardQty(prodId, delta) {
        if (!this.cardQuantities[prodId]) {
            this.cardQuantities[prodId] = 1;
        }
        this.cardQuantities[prodId] = Math.max(1, this.cardQuantities[prodId] + delta);
        const qtyEl = document.getElementById(`qty-${prodId}`);
        if (qtyEl) {
            qtyEl.textContent = this.cardQuantities[prodId];
        }
    },

    addToCartWithQty(productId) {
        const qty = this.cardQuantities[productId] || 1;
        this.addToCart(productId, qty);
    },

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

    renderProductGrid() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        Object.values(PRODUCTS).forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.id = `card-${prod.id}`;
            
            const sliderHtml = this.createSliderHtml(prod);
            
            let optionsHtml = '';
            if (prod.hasOptions) {
                let packOpts = prod.packOptions.map(o => `<option value="${o.value}" data-price="${o.price}">${o.label}</option>`).join('');
                let colorOpts = prod.colorOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
                
                optionsHtml = `
                    <div class="product-options-container">
                        <div class="option-row">
                            <label for="pack-${prod.id}" class="option-label"><svg class="icon-inline" style="width: 16px; height: 16px; margin-right: 6px; stroke: #B25866;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Pack Size:</label>
                            <select id="pack-${prod.id}" class="option-select-cute" onchange="app.updateCardPrice('${prod.id}')">
                                ${packOpts}
                            </select>
                        </div>
                        <div class="option-row">
                            <label for="color-${prod.id}" class="option-label"><svg class="icon-inline" style="width: 16px; height: 16px; margin-right: 6px; stroke: #B25866; fill: none;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><circle cx="13.5" cy="6.5" r=".5" fill="#B25866"/><circle cx="17.5" cy="10.5" r=".5" fill="#B25866"/><circle cx="8.5" cy="7.5" r=".5" fill="#B25866"/><circle cx="6.5" cy="12.5" r=".5" fill="#B25866"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.67-.75 1.67-1.67 0-.42-.16-.8-.44-1.09-.28-.29-.44-.67-.44-1.09 0-.92.75-1.67 1.67-1.67H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"/></svg> Color:</label>
                            <select id="color-${prod.id}" class="option-select-cute">
                                ${colorOpts}
                            </select>
                        </div>
                    </div>
                `;
            }
            
            card.innerHTML = `
                ${sliderHtml}
                <div class="product-info">
                    <h3 class="product-title">${prod.name}</h3>
                    <p class="product-description">${prod.description}</p>
                    ${optionsHtml}
                    <div class="product-bottom">
                        <span class="product-price" id="price-${prod.id}">₹${prod.price.toFixed(2)}</span>
                        <div class="card-action-group" style="display: flex; align-items: center; gap: 8px;">
                            <div class="card-qty-stepper">
                                <button type="button" class="card-qty-btn" onclick="app.changeCardQty('${prod.id}', -1)" title="Decrease Quantity">-</button>
                                <span class="card-qty-val" id="qty-${prod.id}">1</span>
                                <button type="button" class="card-qty-btn" onclick="app.changeCardQty('${prod.id}', 1)" title="Increase Quantity">+</button>
                            </div>
                            <button class="btn-add-cart" title="Add to Basket" onclick="app.addToCartWithQty('${prod.id}')">
                                <svg class="icon-inline" style="stroke: var(--white); width: 22px; height: 22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                    <circle cx="9" cy="20" r="1.5" class="icon-filled"/>
                                    <circle cx="18" cy="20" r="1.5" class="icon-filled"/>
                                    <path d="M3 3h2l2.5 10a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5l1.5-7H6.5"/>
                                </svg>
                            </button>
                        </div>
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
                    <img src="${prod.images[0]}" alt="Handcrafted ${prod.name} plushie keychain" loading="lazy">
                </div>
            `;
        }
        
        let slidesHtml = '';
        prod.images.forEach((img, idx) => {
            slidesHtml += `<img src="${img}" alt="Handcrafted ${prod.name} plushie keychain photo ${idx + 1}" class="slide-img" loading="lazy" style="display: ${idx === 0 ? 'block' : 'none'}; width:100%; height:100%;">`;
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

    currentSlideIdx: {},
    prevSlide(prodId) {
        const prod = PRODUCTS[prodId];
        if (!prod) return;
        if (!this.currentSlideIdx[prodId]) this.currentSlideIdx[prodId] = 0;
        
        const oldIdx = this.currentSlideIdx[prodId];
        this.currentSlideIdx[prodId] = (this.currentSlideIdx[prodId] - 1 + prod.images.length) % prod.images.length;
        
        this.updateSliderUI(prodId, oldIdx, this.currentSlideIdx[prodId]);
    },

    nextSlide(prodId) {
        const prod = PRODUCTS[prodId];
        if (!prod) return;
        if (!this.currentSlideIdx[prodId]) this.currentSlideIdx[prodId] = 0;
        
        const oldIdx = this.currentSlideIdx[prodId];
        this.currentSlideIdx[prodId] = (this.currentSlideIdx[prodId] + 1) % prod.images.length;
        
        this.updateSliderUI(prodId, oldIdx, this.currentSlideIdx[prodId]);
    },

    updateSliderUI(prodId, oldIdx, newIdx) {
        const slider = document.getElementById(`slider-${prodId}`);
        if (!slider) return;
        const images = slider.querySelectorAll('.slide-img');
        if (images[oldIdx]) images[oldIdx].style.display = 'none';
        if (images[newIdx]) images[newIdx].style.display = 'block';
    },

    openLightbox(imageSrc) {
        const lightbox = document.getElementById('lightbox-modal');
        const lightboxImg = document.getElementById('lightbox-img');
        if (!lightbox || !lightboxImg) return;
        
        lightboxImg.src = imageSrc;
        lightbox.classList.add('active');
    },

    openLightboxForSlider(prodId) {
        const prod = PRODUCTS[prodId];
        if (!prod) return;
        const idx = this.currentSlideIdx[prodId] || 0;
        const imageSrc = prod.images[idx];
        this.openLightbox(imageSrc);
    },

    closeLightbox() {
        const lightbox = document.getElementById('lightbox-modal');
        if (lightbox) lightbox.classList.remove('active');
    },

    setupHotspots() {
        const spots = document.querySelectorAll('.hotspot');
        const tooltip = document.getElementById('hotspot-tooltip');
        if (!spots.length || !tooltip) return;
        
        spots.forEach(spot => {
            const prodId = spot.dataset.product;
            const product = this.getProduct(prodId);
            
            if (!product) return;
            
            spot.addEventListener('mouseenter', (e) => {
                tooltip.querySelector('h4').textContent = product.name;
                tooltip.querySelector('p').textContent = `₹${product.price.toFixed(2)}`;
                tooltip.querySelector('button').setAttribute('onclick', `app.addToCart('${product.id}')`);
                
                const rect = spot.getBoundingClientRect();
                const containerRect = spot.parentElement.getBoundingClientRect();
                
                const leftPos = rect.left - containerRect.left + (rect.width / 2) - 90;
                const topPos = rect.top - containerRect.top - 120;
                
                tooltip.style.left = `${leftPos}px`;
                tooltip.style.top = `${topPos}px`;
                tooltip.classList.add('active');
            });
            
            spot.addEventListener('mouseleave', (e) => {
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

    renderCartPage() {
        const container = document.getElementById('cart-container');
        if (!container) return;
        
        const isAuthenticated = window.auth && window.auth.isAuthenticated();
        
        if (!isAuthenticated) {
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
        
        let itemsHtml = '';
        let subtotal = 0;
        
        this.cart.forEach(item => {
            const product = this.getProduct(item.product_id);
            if (!product) return;
            
            const lineTotal = product.price * item.quantity;
            subtotal += lineTotal;
            
            const thumbImg = (product.images && product.images.length > 0) ? product.images[0] : 'assets/bears_colors.jpg';
            
            itemsHtml += `
                <div class="cart-item-row">
                    <img src="${thumbImg}" alt="${product.name}" class="cart-item-img">
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
        const lightbox = document.getElementById('lightbox-modal');
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    this.closeLightbox();
                }
            });
        }
        
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', this.handleContactSubmit);
        }
        
        this.setupHotspots();
    }
};

app.PRODUCTS = PRODUCTS;
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
