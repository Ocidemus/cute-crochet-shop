// Core Shop Logic for Cute Crochet Shop

const PRODUCTS = {
    'custom-design': {
        id: 'custom-design',
        slug: 'custom-design',
        name: 'Request Custom Design',
        description: 'Have a specific design in mind? Let us know and we will craft it for you! We will contact you once the design is approved.',
        price: 0,
        images: ['/assets/custom_design.png'],
        hasOptions: false,
        fromDB: true
    },
    'four-bear-combo': {
        id: 'four-bear-combo',
        slug: 'four-bear-combo',
        name: '4 Bear Family Combo Set',
        price: 1249.00,
        description: 'Complete set of 4 handcrafted pastel plush bears (Chocolate Brown, Vanilla White, Pastel Pink & Sandy Beige) with cute bow ribbons.',
        images: ['assets/four_bear_combo_1.jpg', 'assets/four_bear_combo_2.jpg', 'assets/four_bear_combo_3.jpg', 'assets/four_bear_combo_4.jpg']
    },
    'brown-white-bear-combo': {
        id: 'brown-white-bear-combo',
        slug: 'brown-white-bear-combo',
        name: 'Brown & White Bear Duo Combo',
        price: 699.00,
        description: 'Matching pair of chocolate brown and vanilla white plush teddy bears with sweet ribbon bows.',
        images: ['assets/brown_white_bear_1.jpg', 'assets/brown_white_bear_2.jpg', 'assets/brown_white_bear_3.jpg', 'assets/brown_white_bear_4.jpg']
    },
    'brown-bear': {
        id: 'brown-bear',
        slug: 'brown-bear',
        name: 'Chocolate Brown Teddy Bear',
        price: 399.00,
        description: 'Classic chocolate brown velvet teddy bear plushie wearing a cute white bow ribbon.',
        images: ['assets/brown_bear_1.jpg', 'assets/brown_bear_2.jpg', 'assets/brown_bear_3.jpg', 'assets/brown_bear_4.jpg']
    },
    'white-bear': {
        id: 'white-bear',
        slug: 'white-bear',
        name: 'Vanilla White Teddy Bear',
        price: 399.00,
        description: 'Dreamy vanilla white velvet teddy bear plushie with a pastel pink bow ribbon and rosy cheeks.',
        images: ['assets/white_bear_1.jpg', 'assets/white_bear_2.jpg', 'assets/white_bear_3.jpg']
    },
    'pink-bear': {
        id: 'pink-bear',
        slug: 'pink-bear',
        name: 'Pastel Pink Teddy Bear',
        price: 399.00,
        description: 'Sweet pastel pink velvet teddy bear plushie with a white bow ribbon, ultra-soft and huggable.',
        images: ['assets/pink_bear_1.jpg', 'assets/pink_bear_2.jpg']
    },
    'beige-bear': {
        id: 'beige-bear',
        slug: 'beige-bear',
        name: 'Sandy Beige Teddy Bear',
        price: 399.00,
        description: 'Warm sandy beige velvet teddy bear plushie wearing a pastel pink bow ribbon.',
        images: ['assets/beige_bear.jpg', 'assets/four_bear_combo_1.jpg']
    },
    'bears': {
        id: 'bears',
        slug: 'bears',
        name: 'Custom Bear Pack (Choose Size & Color)',
        price: 399.00,
        description: 'Customize your own handcrafted plush bear bundle! Choose single, pair, or set of 3/4 in your favorite pastel color.',
        images: ['assets/bears_colors.jpg', 'assets/four_bear_combo_1.jpg', 'assets/brown_white_bear_1.jpg', 'assets/brown_bear_1.jpg', 'assets/white_bear_1.jpg'],
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
    'trio-combo': {
        id: 'trio-combo',
        slug: 'trio-combo',
        name: 'Cute Companions Trio Combo',
        price: 899.00,
        description: 'Adorable 3-piece plush keychain bundle featuring Creamy White Capybara, Earmuff Penguin, and Chubby Panda.',
        images: ['assets/trio_combo_1.jpg', 'assets/trio_combo_2.jpg', 'assets/trio_combo_3.jpg', 'assets/trio_combo_4.jpg']
    },
    'tulip-panda-combo': {
        id: 'tulip-panda-combo',
        slug: 'tulip-panda-combo',
        name: 'Twin Pandas & White Tulip Combo Set',
        price: 799.00,
        description: 'Special gift set of two rosy-cheeked panda plush keychains paired with a double white tulip charm.',
        images: ['assets/tulip_panda_combo_1.jpg', 'assets/tulip_panda_combo_2.jpg', 'assets/tulip_panda_combo_3.jpg', 'assets/tulip_panda_combo_4.jpg']
    },
    'panda': {
        id: 'panda',
        slug: 'panda',
        name: 'Chubby Panda Plush Keychain',
        price: 349.00,
        description: 'Super round and squishy panda keychain with rosy pink cheeks and happy stitched eyes.',
        images: ['assets/panda_new_1.jpg', 'assets/panda_new_2.jpg', 'assets/panda_new_3.jpg', 'assets/panda_new_4.jpg', 'assets/panda_new_5.jpg']
    },
    'penguin': {
        id: 'penguin',
        slug: 'penguin',
        name: 'Cozy Mini Penguin Keychain',
        price: 349.00,
        description: 'Tiny penguin companion keychain featuring custom knit details, orange beak, and cute webbed feet.',
        images: ['assets/penguin_new_1.jpg', 'assets/penguin_new_2.jpg', 'assets/penguin_new_3.jpg', 'assets/penguin_new_4.jpg']
    },
    'capybara': {
        id: 'capybara',
        slug: 'capybara',
        name: 'Chubby Brown Capybara Keychain',
        price: 349.00,
        description: 'Squishy brown capybara plushie keychain with closed happy eyes and cute little ears.',
        images: ['assets/capybara_new_1.jpg', 'assets/capybara_new_2.jpg', 'assets/capybara_new_3.jpg', 'assets/capybara_new_4.jpg']
    },
    'white-capybara': {
        id: 'white-capybara',
        slug: 'white-capybara',
        name: 'Creamy White Capybara Keychain',
        price: 349.00,
        description: 'Cozy cream-white capybara plush keychain with chocolate brown ears, paws, and sleepy eyes.',
        images: ['assets/white_capybara_1.jpg', 'assets/white_capybara_2.jpg', 'assets/white_capybara_3.jpg', 'assets/white_capybara_4.jpg']
    },
    'white-teddy': {
        id: 'white-teddy',
        slug: 'white-teddy',
        name: 'Mini White Panda Bear with Bow Tie',
        price: 349.00,
        description: 'Cute standing mini white bear keychain with black panda ears, rosy cheeks, and a dapper bow tie.',
        images: ['assets/white_teddy_1.jpg', 'assets/white_teddy_2.jpg', 'assets/white_teddy_3.jpg', 'assets/white_teddy_4.jpg']
    },
    'duck-holding-flower': {
        id: 'duck-holding-flower',
        slug: 'duck-holding-flower',
        name: 'Little Duck Holding Pink Flower',
        price: 399.00,
        description: 'Adorable handmade white duckling with rosy cheeks holding a blooming pink flower.',
        images: ['assets/duck_flower_1.jpg', 'assets/duck_flower_2.jpg', 'assets/duck_flower_3.jpg', 'assets/duck_flower_4.jpg', 'assets/duck_flower_5.jpg']
    },
    'baby-chick': {
        id: 'baby-chick',
        slug: 'baby-chick',
        name: 'Fluffy Baby Chick Plushie',
        price: 299.00,
        description: 'Super soft and round yellow baby chick plushie keychain crafted with cozy chenille velvet yarn.',
        images: ['assets/baby_chick_1.jpg', 'assets/baby_chick_2.jpg']
    },
    'piggy': {
        id: 'piggy',
        slug: 'piggy',
        name: 'Cute Pastel Piggy Moo Keychain',
        price: 299.00,
        description: 'Adorable pastel plush keychain with a pink snout, cute ears, and soft spotted patches.',
        images: ['assets/piggy_1.jpg', 'assets/piggy_2.jpg', 'assets/piggy_3.jpg', 'assets/piggy_4.jpg']
    },
    'bouquet': {
        id: 'bouquet',
        slug: 'bouquet',
        name: 'Everlasting Red Rose Bouquet',
        price: 799.00,
        description: 'Romantic handmade crochet red rose bouquet wrapped in a cozy cream cone that blooms forever.',
        images: ['assets/rose_bouquet_1.jpg', 'assets/rose_bouquet_2.jpg', 'assets/rose_bouquet_3.jpg', 'assets/rose_bouquet_4.jpg', 'assets/rose_bouquet_5.jpg']
    },
    'rose-flower-pot': {
        id: 'rose-flower-pot',
        slug: 'rose-flower-pot',
        name: 'Mini Crochet Rose Flower Pot',
        price: 649.00,
        description: 'Charming white crochet basket pot filled with a lush removable bouquet of handcrafted red roses.',
        images: ['assets/rose_pot_1.jpg', 'assets/rose_pot_2.jpg', 'assets/rose_pot_3.jpg', 'assets/rose_pot_4.jpg', 'assets/rose_pot_5.jpg']
    },
    'flower-mat': {
        id: 'flower-mat',
        slug: 'flower-mat',
        name: 'Blooming Rose Bouquet Coaster Mat',
        price: 549.00,
        description: 'Handcrafted cream crochet table mat bordered with 3D red roses that folds into a mini rose bouquet.',
        images: ['assets/flower_mat_1.jpg', 'assets/flower_mat_2.jpg', 'assets/flower_mat_3.jpg', 'assets/flower_mat_4.jpg']
    },
    'sunflower-and-bee': {
        id: 'sunflower-and-bee',
        slug: 'sunflower-and-bee',
        name: 'Sunflower & Bumblebee Keychain Duo',
        price: 499.00,
        description: 'Cheerful crochet sunflower paired with a chubby striped bumblebee on pearl beaded keychains.',
        images: ['assets/sunflower_bee_1.jpg', 'assets/sunflower_bee_2.jpg', 'assets/sunflower_bee_3.jpg', 'assets/sunflower_bee_4.jpg']
    },
    'sunflower': {
        id: 'sunflower',
        slug: 'sunflower',
        name: 'Pearl Beaded Sunflower Keychain',
        price: 299.00,
        description: 'Bright golden crochet sunflower charm suspended from an iridescent pearl bead keychain strap.',
        images: ['assets/sunflower_1.jpg', 'assets/sunflower_2.jpg', 'assets/sunflower_3.jpg', 'assets/sunflower_4.jpg']
    },
    'pink-purple-tulip': {
        id: 'pink-purple-tulip',
        slug: 'pink-purple-tulip',
        name: 'Pink & Purple Double Tulip Keychain',
        price: 299.00,
        description: 'Matching pair of pastel pink and lavender purple crochet tulip flower buds on a leafy green stem.',
        images: ['assets/pink_purple_tulip_1.jpg', 'assets/flowers_1.jpg', 'assets/flowers_2.jpg']
    },
    'white-pink-flower': {
        id: 'white-pink-flower',
        slug: 'white-pink-flower',
        name: 'Pink & White Twin Tulip Keychain',
        price: 299.00,
        description: 'Soft blush pink and pure white crochet tulip flower duo hanging from a braided green leaf strap.',
        images: ['assets/white_pink_flower_1.jpg', 'assets/white_pink_flower_2.jpg', 'assets/white_pink_flower_3.jpg']
    },
    'white-tulip': {
        id: 'white-tulip',
        slug: 'white-tulip',
        name: 'Pure White Double Tulip Keychain',
        price: 299.00,
        description: 'Elegant twin white crochet bell-tulip flowers with a hand-stitched green leaf loop for bags and keys.',
        images: ['assets/white_tulip_1.jpg', 'assets/white_tulip_2.jpg', 'assets/white_tulip_3.jpg', 'assets/white_tulip_4.jpg']
    },
    'black-bow': {
        id: 'black-bow',
        slug: 'black-bow',
        name: 'Classic Black Ribbon Bow Keychain',
        price: 249.00,
        description: 'Chic handcrafted black crochet ribbon bow charm keychain, perfect for bags, backpacks, and keys.',
        images: ['assets/black_bow_1.jpg', 'assets/black_bow_2.jpg', 'assets/black_bow_3.jpg', 'assets/black_bow_4.jpg', 'assets/black_bow_5.jpg']
    },
    'hearts': {
        id: 'hearts',
        slug: 'hearts',
        name: 'Puffy Crochet Heart Keychain',
        price: 299.00,
        description: 'A cozy puffy pink heart keychain to remind you of warm handmade love.',
        images: ['assets/hearts_1.jpg', 'assets/hearts_2.jpg', 'assets/hearts_3.jpg', 'assets/hearts_4.jpg']
    },
    'spiderman': {
        id: 'spiderman',
        slug: 'spiderman',
        name: 'Spiderman Crochet Keychain',
        price: 499.00,
        description: 'Handcrafted Spiderman hero crochet keychain with detailed mask pattern.',
        images: ['assets/spiderman_1.jpg', 'assets/spiderman_2.jpg', 'assets/spiderman_3.jpg', 'assets/spiderman_4.jpg']
    }
};

// Legacy alias lookup map for older cart items or links
const LEGACY_PRODUCT_ALIASES = {
    'heart': 'hearts',
    'tulips': 'pink-purple-tulip',
    'flowers': 'pink-purple-tulip',
    'cute': 'duck-holding-flower',
    'duck': 'duck-holding-flower',
    'bow': 'black-bow',
    'combo': 'trio-combo',
    'teddy': 'white-teddy'
};

const app = {
    cart: [],
    productsByUuid: {},

    async init() {
        await this.fetchDynamicProducts();
        this.loadCart();
        this.renderProductGrid();
        this.setupEventListeners();
        this.updateCartBadge();
    },

    // Dynamic Product & Variant Resolver
    getProduct(id) {
        if (!id) return null;
        if (PRODUCTS[id]) return PRODUCTS[id];
        if (LEGACY_PRODUCT_ALIASES[id] && PRODUCTS[LEGACY_PRODUCT_ALIASES[id]]) {
            return PRODUCTS[LEGACY_PRODUCT_ALIASES[id]];
        }
        if (this.productsByUuid && this.productsByUuid[id]) {
            return this.productsByUuid[id];
        }
        
        // 1. Try stripping pack/color variant suffixes (e.g. 'slug-single-brown' or 'uuid-single-brown')
        const parts = String(id).split('-');
        while (parts.length > 1) {
            parts.pop();
            const baseKey = parts.join('-');
            if (PRODUCTS[baseKey]) {
                return PRODUCTS[baseKey];
            }
            if (LEGACY_PRODUCT_ALIASES[baseKey] && PRODUCTS[LEGACY_PRODUCT_ALIASES[baseKey]]) {
                return PRODUCTS[LEGACY_PRODUCT_ALIASES[baseKey]];
            }
            if (this.productsByUuid && this.productsByUuid[baseKey]) {
                return this.productsByUuid[baseKey];
            }
        }

        // 2. Search PRODUCTS by matching id, dbId, or slug property
        for (const k in PRODUCTS) {
            const p = PRODUCTS[k];
            if (p && (p.id === id || p.dbId === id || p.slug === id || (typeof id === 'string' && id.startsWith(k + '-')))) {
                return p;
            }
        }

        return null;
    },

    // Extract human-readable color/pack labels from a cart item.
    // First checks saved snapshots (new items), then falls back to
    // parsing the product_id suffix against the base product's options (old items).
    getVariantLabels(item) {
        const colorLabel = item.colorLabel || null;
        const packLabel  = item.packLabel  || null;
        if (colorLabel || packLabel) return { colorLabel, packLabel };

        // Fallback: decode suffix from product_id string e.g. "bears-pair-brown"
        const base = this.getProduct(item.product_id);
        if (!base || !base.hasOptions) return { colorLabel: null, packLabel: null };

        // The suffix is everything after the base product's id/slug
        const baseId  = base.slug || base.id || '';
        const suffix  = String(item.product_id).replace(new RegExp('^' + baseId + '-?'), '');
        if (!suffix) return { colorLabel: null, packLabel: null };

        let resolvedPack = null, resolvedColor = null;

        // Try each packOption value as a prefix of the suffix
        if (base.packOptions) {
            for (const opt of base.packOptions) {
                if (suffix === opt.value || suffix.startsWith(opt.value + '-')) {
                    resolvedPack = opt.label;
                    const colorVal = suffix.slice(opt.value.length).replace(/^-/, '');
                    if (colorVal && base.colorOptions) {
                        const co = base.colorOptions.find(c => c.value === colorVal);
                        if (co) resolvedColor = co.label;
                    }
                    break;
                }
            }
        }

        // If no pack match, try matching the whole suffix as a color value directly
        if (!resolvedPack && base.colorOptions) {
            const co = base.colorOptions.find(c => c.value === suffix);
            if (co) resolvedColor = co.label;
        }

        return { colorLabel: resolvedColor, packLabel: resolvedPack };
    },

    // Cart Management
    getCart() {
        if (!this.cart || !Array.isArray(this.cart)) {
            const localCartStr = localStorage.getItem('crochet_local_cart');
            try {
                this.cart = localCartStr ? JSON.parse(localCartStr) : [];
            } catch (e) {
                this.cart = [];
            }
        }
        return this.cart || [];
    },

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

    async saveCartItem(productId, quantity, isUpdate = false, colorLabel = null, packLabel = null) {
        const existingIdx = this.cart.findIndex(i => i.product_id === productId);
        const resolved = this.getProduct(productId);

        // Resolve price: check pack options for a price matching this variant
        let resolvedPrice = resolved ? resolved.price : 0.00;
        if (resolved && resolved.packOptions && packLabel) {
            const matchedPack = resolved.packOptions.find(o => o.label === packLabel);
            if (matchedPack) resolvedPrice = matchedPack.price;
        }

        if (existingIdx > -1) {
            if (quantity <= 0) {
                this.cart.splice(existingIdx, 1);
            } else {
                if (isUpdate) {
                    this.cart[existingIdx].quantity = quantity;
                } else {
                    this.cart[existingIdx].quantity += quantity;
                }
                if (resolved) {
                    this.cart[existingIdx].name = resolved.name;
                    this.cart[existingIdx].price = resolvedPrice;
                    if (resolved.images) this.cart[existingIdx].images = resolved.images;
                }
                // Preserve labels if already stored and not being overwritten
                if (colorLabel !== null) this.cart[existingIdx].colorLabel = colorLabel;
                if (packLabel !== null) this.cart[existingIdx].packLabel = packLabel;
            }
        } else if (quantity > 0) {
            this.cart.push({
                product_id: productId,
                quantity: quantity,
                name: resolved ? resolved.name : 'Crochet Item',
                price: resolvedPrice,
                images: resolved ? resolved.images : ['/assets/images/placeholder.jpg'],
                colorLabel: colorLabel || null,
                packLabel: packLabel || null
            });
        }
        
        localStorage.setItem('crochet_local_cart', JSON.stringify(this.cart));
        this.updateCartBadge();
        
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
            this.renderProductGrid();
        } else if (window.location.pathname.endsWith('cart.html') || window.location.pathname.endsWith('cart')) {
            this.renderCartPage();
        }
        if (window.profile && typeof window.profile.loadCartPreview === 'function') {
            window.profile.loadCartPreview();
            window.dispatchEvent(new Event('cartUpdated'));
        }
    },

    async fetchDynamicProducts() {
        const hiddenVariantPrefix = /^(bears-(single|pair|set3|set4)-|teddy-(single|pair)-)/;
        const hiddenLegacySlugs = new Set(['duck', 'tulips', 'heart', 'cute', 'bow', 'flowers', 'combo', 'teddy']);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.products)) {
                data.products.forEach(p => {
                    const prod = p.Products || p;
                    const slugKey = prod.slug;
                    const idKey = prod.id;

                    if (slugKey && (hiddenVariantPrefix.test(slugKey) || hiddenLegacySlugs.has(slugKey))) {
                        return;
                    }

                    const existing = slugKey ? PRODUCTS[slugKey] : null;
                    const dbImages = (prod.images && prod.images.length > 0) ? prod.images : null;
                    // Use curated local images when available unless admin uploaded custom /api/images/
                    const hasAdminUploadedImg = dbImages && dbImages.some(u => String(u).startsWith('/api/images/'));
                    const finalImages = (existing && existing.images && !hasAdminUploadedImg)
                        ? existing.images
                        : (dbImages || ['/assets/images/placeholder.jpg']);

                    const prodObj = {
                        id: slugKey || idKey,
                        dbId: idKey,
                        slug: slugKey || idKey,
                        name: prod.name || (existing ? existing.name : 'Crochet Item'),
                        description: prod.description || (existing ? existing.description : ''),
                        price: !isNaN(parseFloat(prod.price)) ? parseFloat(prod.price) : (existing ? existing.price : 0),
                        images: finalImages,
                        hasOptions: existing ? existing.hasOptions : !!(prod.colors && prod.colors.length > 0),
                        packOptions: existing ? existing.packOptions : undefined,
                        colorOptions: existing ? existing.colorOptions : undefined,
                        fromDB: true
                    };

                    if (prodObj.hasOptions && (!prodObj.colorOptions || !prodObj.packOptions) && prod.colors && prod.colors.length > 0) {
                        prodObj.colorOptions = prod.colors.map(c => ({
                            label: c.trim(),
                            value: c.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
                        }));
                        prodObj.packOptions = [
                            { label: `Single (₹${parseFloat(prod.price)})`, value: 'single', price: parseFloat(prod.price) }
                        ];
                    }

                    const key = slugKey || idKey;
                    if (key) PRODUCTS[key] = prodObj;
                    if (idKey) this.productsByUuid[idKey] = prodObj;
                });
            }
        } catch (err) {
            console.error('Failed to fetch dynamic products:', err);
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
        
        if (this.updateCardActionUI) {
            this.updateCardActionUI(prodId);
        }
    },

    addToCart(productId, quantity = 1) {
        let finalProductId = productId;
        let colorLabel = null;
        let packLabel = null;
        const prodObj = PRODUCTS[productId];
        
        if (prodObj && prodObj.hasOptions) {
            const packSelect = document.getElementById(`pack-${productId}`);
            const colorSelect = document.getElementById(`color-${productId}`);
            const packVal = packSelect ? packSelect.value : 'single';
            const colorVal = colorSelect ? colorSelect.value : null;
            finalProductId = colorVal ? `${productId}-${packVal}-${colorVal}` : `${productId}-${packVal}`;

            // Extract human-readable labels from selected options
            if (packSelect && packSelect.selectedIndex >= 0) {
                packLabel = packSelect.options[packSelect.selectedIndex].text;
            } else if (prodObj.packOptions) {
                const match = prodObj.packOptions.find(o => o.value === packVal);
                if (match) packLabel = match.label;
            }
            if (colorVal && colorSelect && colorSelect.selectedIndex >= 0) {
                colorLabel = colorSelect.options[colorSelect.selectedIndex].text;
            } else if (colorVal && prodObj.colorOptions) {
                const match = prodObj.colorOptions.find(o => o.value === colorVal);
                if (match) colorLabel = match.label;
            }
        }
        
        this.saveCartItem(finalProductId, quantity, false, colorLabel, packLabel);
        
        const resolved = this.getProduct(finalProductId);
        this.showToast(`Added ${quantity}x ${resolved ? resolved.name : 'item'} to your cart!`);
    },

    updateCardActionUI(prodId) {
        const actionGroup = document.getElementById(`action-group-${prodId}`);
        if (!actionGroup) return;

        // Build finalProductId the same way addToCart does — no hardcoded color fallback
        let finalProductId = prodId;
        const prodObj = PRODUCTS[prodId];
        if (prodObj && prodObj.hasOptions) {
            const packSelect = document.getElementById(`pack-${prodId}`);
            const colorSelect = document.getElementById(`color-${prodId}`);
            const packVal = packSelect ? packSelect.value : 'single';
            const colorVal = colorSelect ? colorSelect.value : null;
            finalProductId = colorVal ? `${prodId}-${packVal}-${colorVal}` : `${prodId}-${packVal}`;
        }

        const cartItem = this.cart.find(i => i.product_id === finalProductId);
        
        if (prodId === 'custom-design') {
            actionGroup.innerHTML = `
                <button class="btn-cute" style="border-radius: 8px; padding: 8px 16px; font-weight: bold; width: 100%; justify-content: center;" onclick="window.location.href='/contact?subject=Custom%20Design%20Request'">
                    Request Design
                </button>
            `;
            return;
        }

        if (cartItem && cartItem.quantity > 0) {
            actionGroup.innerHTML = `
                <div class="card-qty-stepper">
                    <button type="button" class="card-qty-btn" onclick="app.saveCartItem('${finalProductId}', ${cartItem.quantity - 1}, true); app.updateCardActionUI('${prodId}')" title="Decrease Quantity">-</button>
                    <span class="card-qty-val">${cartItem.quantity}</span>
                    <button type="button" class="card-qty-btn" onclick="app.saveCartItem('${finalProductId}', ${cartItem.quantity + 1}, true); app.updateCardActionUI('${prodId}')" title="Increase Quantity">+</button>
                </div>
            `;
        } else {
            // Call addToCart (not saveCartItem) so color/pack labels are always captured
            actionGroup.innerHTML = `
                <button class="btn-add-cart" style="border-radius: 8px; padding: 8px 16px; font-weight: bold;" title="Add to Basket" onclick="app.addToCart('${prodId}')">
                    Buy
                </button>
            `;
        }
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

        // Only render DB-sourced products (fromDB: true).
        // Static/hardcoded products remain available for cart resolution but are not shown.
        const dbProducts = Object.values(PRODUCTS).filter(p => p.fromDB === true);

        // De-duplicate: same product is keyed by both slug AND uuid, only render once
        const seen = new Set();
        const uniqueProducts = dbProducts.filter(p => {
            const key = p.slug || p.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (uniqueProducts.length === 0) {
            grid.innerHTML = `
                <div style="text-align:center; padding: 60px 20px; color: var(--text-muted); grid-column: 1/-1;">
                    <svg style="width:64px;height:64px;opacity:0.3;margin-bottom:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    <p style="font-size:18px;font-weight:700;font-family:var(--font-heading);">No products available right now</p>
                    <p style="font-size:14px;margin-top:6px;">Check back soon — new handcrafted items are being added!</p>
                </div>
            `;
            return;
        }

        uniqueProducts.forEach(prod => {
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
                            <select id="color-${prod.id}" class="option-select-cute" onchange="app.updateCardActionUI('${prod.id}')">
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
                        <div id="action-group-${prod.id}" class="card-action-group" style="display: flex; align-items: center; gap: 8px;">
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
            this.updateCardActionUI(prod.id);
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

    currentLightboxImages: [],
    currentLightboxIdx: 0,

    openLightbox(imageSrc, prodId, imageIdx) {
        const lightbox = document.getElementById('lightbox-modal');
        const lightboxImg = document.getElementById('lightbox-img');
        if (!lightbox || !lightboxImg) return;

        let prod = prodId ? this.getProduct(prodId) : null;
        if (!prod && imageSrc) {
            for (let k in PRODUCTS) {
                if (PRODUCTS[k].images && PRODUCTS[k].images.includes(imageSrc)) {
                    prod = PRODUCTS[k];
                    break;
                }
            }
        }

        if (prod && prod.images && prod.images.length > 0) {
            this.currentLightboxImages = prod.images;
            if (typeof imageIdx === 'number') {
                this.currentLightboxIdx = imageIdx;
            } else {
                const foundIdx = prod.images.indexOf(imageSrc);
                this.currentLightboxIdx = foundIdx !== -1 ? foundIdx : 0;
            }
        } else {
            this.currentLightboxImages = [imageSrc];
            this.currentLightboxIdx = 0;
        }

        this.updateLightboxUI();
        lightbox.classList.add('active');
    },

    openLightboxForSlider(prodId) {
        const prod = this.getProduct(prodId);
        if (!prod) return;
        const idx = this.currentSlideIdx[prodId] || 0;
        this.openLightbox(prod.images[idx], prodId, idx);
    },

    updateLightboxUI() {
        const lightboxImg = document.getElementById('lightbox-img');
        const prevBtn = document.getElementById('lightbox-prev');
        const nextBtn = document.getElementById('lightbox-next');
        const counter = document.getElementById('lightbox-counter');

        if (!lightboxImg) return;

        const total = this.currentLightboxImages.length;
        const currentSrc = this.currentLightboxImages[this.currentLightboxIdx] || '';
        lightboxImg.src = currentSrc;

        if (total > 1) {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
            if (counter) {
                counter.style.display = 'block';
                counter.innerText = `${this.currentLightboxIdx + 1} / ${total}`;
            }
        } else {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (counter) counter.style.display = 'none';
        }
    },

    prevLightboxImage() {
        if (!this.currentLightboxImages.length) return;
        this.currentLightboxIdx = (this.currentLightboxIdx - 1 + this.currentLightboxImages.length) % this.currentLightboxImages.length;
        this.updateLightboxUI();
    },

    nextLightboxImage() {
        if (!this.currentLightboxImages.length) return;
        this.currentLightboxIdx = (this.currentLightboxIdx + 1) % this.currentLightboxImages.length;
        this.updateLightboxUI();
    },

    closeLightbox() {
        const lightbox = document.getElementById('lightbox-modal');
        if (lightbox) lightbox.classList.remove('active');
    },

    switchShowcaseScene(sceneKey, btnEl) {
        const scenes = {
            'family': 'scene-family',
            'cozy-desk': 'scene-cozy-desk',
            'spiderman-edition': 'scene-spiderman-edition',
            'trio-companions': 'scene-trio-companions'
        };
        Object.values(scenes).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const targetEl = document.getElementById(scenes[sceneKey]);
        if (targetEl) targetEl.style.display = 'block';

        document.querySelectorAll('.scene-tab-btn').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');

        const tooltip = document.getElementById('hotspot-tooltip');
        if (tooltip) tooltip.classList.remove('active');
    },

    scrollToProduct(prodId) {
        const product = this.getProduct(prodId);
        const targetId = product ? product.id : prodId;
        const card = document.getElementById(`card-${targetId}`);
        const tooltip = document.getElementById('hotspot-tooltip');
        if (tooltip) tooltip.classList.remove('active');

        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.remove('highlight-target');
            void card.offsetWidth; // trigger reflow
            card.classList.add('highlight-target');
            setTimeout(() => card.classList.remove('highlight-target'), 3400);
        }
    },

    setupHotspots() {
        const spots = document.querySelectorAll('.hotspot');
        const tooltip = document.getElementById('hotspot-tooltip');
        if (!spots.length || !tooltip) return;

        const showSpotTooltip = (spot) => {
            const prodId = spot.dataset.product;
            const product = this.getProduct(prodId);
            if (!product) return;

            const container = spot.closest('.interactive-scene') || spot.parentElement;
            if (container && tooltip.parentElement !== container) {
                container.appendChild(tooltip);
            }

            const imgEl = document.getElementById('hotspot-tooltip-img');
            const titleEl = document.getElementById('hotspot-tooltip-title') || tooltip.querySelector('h4');
            const priceEl = document.getElementById('hotspot-tooltip-price') || tooltip.querySelector('p');
            const viewBtn = document.getElementById('hotspot-view-btn');
            const buyBtn = document.getElementById('hotspot-buy-btn') || tooltip.querySelector('button');

            if (imgEl && product.images && product.images.length > 0) {
                imgEl.src = product.images[0];
                imgEl.alt = product.name;
            }
            if (titleEl) titleEl.textContent = product.name;
            if (priceEl) priceEl.textContent = `₹${product.price.toFixed(2)}`;
            if (viewBtn) {
                viewBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    this.scrollToProduct(product.id);
                };
            }
            if (buyBtn) {
                buyBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    this.addToCart(product.id);
                };
            }

            const rect = spot.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const tooltipWidth = 210;
            let leftPos = rect.left - containerRect.left + (rect.width / 2) - (tooltipWidth / 2);
            leftPos = Math.max(10, Math.min(leftPos, containerRect.width - tooltipWidth - 10));

            let topPos = rect.top - containerRect.top - 225;
            if (topPos < 10) {
                topPos = rect.bottom - containerRect.top + 12;
            }

            tooltip.style.left = `${leftPos}px`;
            tooltip.style.top = `${topPos}px`;
            tooltip.classList.add('active');
        };

        spots.forEach(spot => {
            spot.addEventListener('mouseenter', () => showSpotTooltip(spot));

            spot.addEventListener('click', (e) => {
                e.stopPropagation();
                const prodId = spot.dataset.product;
                if (window.innerWidth <= 768) {
                    showSpotTooltip(spot);
                } else {
                    this.scrollToProduct(prodId);
                }
            });

            spot.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!tooltip.matches(':hover') && !spot.matches(':hover')) {
                        tooltip.classList.remove('active');
                    }
                }, 140);
            });
        });

        tooltip.addEventListener('mouseleave', () => {
            tooltip.classList.remove('active');
        });
    },

    renderCartPage() {
        const container = document.getElementById('cart-container');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="cart-lock-screen cute-card">
                    <div class="cart-lock-icon" style="color: var(--primary);"><svg class="icon-inline" style="width: 60px; height: 60px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="20" r="1.5" class="icon-filled"/><circle cx="18" cy="20" r="1.5" class="icon-filled"/><path d="M3 3h2l2.5 10a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5l1.5-7H6.5"/></svg></div>
                    <h2>Your basket is empty!</h2>
                    <p>Go look at some cute plushies and add them to your cart. They are waiting for a loving home!</p>
                    <a href="/" class="btn-cute">Browse Products <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="12" cy="13" r="6"/><circle cx="9.5" cy="11.5" r="0.6" fill="currentColor"/><circle cx="14.5" cy="11.5" r="0.6" fill="currentColor"/><path d="M10 15a2 2 0 0 0 4 0h-4z"/></svg></a>
                </div>
            `;
            return;
        }
        
        let itemsHtml = '';
        let subtotal = 0;
        
        this.cart.forEach(item => {
            const product = this.getProduct(item.product_id);
            // Prefer snapshot values saved at addToCart time
            const name   = item.name  || (product ? product.name  : item.product_id);
            const price  = item.price || (product ? product.price : 0.00);
            const images = (item.images && item.images.length > 0) ? item.images
                         : (product && product.images && product.images.length > 0) ? product.images
                         : ['/assets/images/placeholder.jpg'];
            
            const lineTotal = price * item.quantity;
            subtotal += lineTotal;
            
            const thumbImg = images[0] || '/assets/images/placeholder.jpg';
            
            // Resolve color/pack labels — works for new (snapshot) and old (suffix-parsed) items
            const { colorLabel, packLabel } = this.getVariantLabels(item);
            const variantTags = [];
            if (packLabel) variantTags.push(packLabel);
            if (colorLabel) variantTags.push(colorLabel);
            const variantTagsHtml = variantTags.length > 0
                ? variantTags.map(tag => `<span class="cart-variant-tag">${tag}</span>`).join('')
                : '';

            itemsHtml += `
                <div class="cart-item-row">
                    <img src="${thumbImg}" alt="${name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${name}</h3>
                        ${variantTagsHtml ? `<div class="cart-variant-tags">${variantTagsHtml}</div>` : ''}
                        <p class="cart-item-price">₹${price.toFixed(2)}</p>
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
                    <a href="/checkout" class="btn-cute" style="width: 100%; text-align: center; margin-top: 25px;">Proceed to Checkout <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></a>
                </div>
            </div>
        `;
    },

    async handleContactSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const name = form.name.value.trim();
        const email = form.email.value.trim().toLowerCase();
        const message = form.message.value.trim();
        
        const errorEl = document.getElementById('contact-error');
        const successEl = document.getElementById('contact-success');
        const msgTextarea = document.getElementById('contact-message');
        const emailInput = document.getElementById('contact-email');
        
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
        if (msgTextarea) {
            msgTextarea.style.border = '';
            msgTextarea.style.backgroundColor = '';
        }
        if (emailInput) {
            emailInput.style.border = '';
            emailInput.style.backgroundColor = '';
        }

        // Email format & disposable domain validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const disposableRegex = /@(test|example|invalid|disposable|mailinator|tempmail|10minutemail|guerrillamail)\./i;

        if (!emailRegex.test(email) || disposableRegex.test(email)) {
            if (errorEl) {
                errorEl.innerHTML = `
                    <div style="background: #FFF0F2; border: 2px solid #FF8DA1; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
                        <svg class="icon-inline" style="width: 20px; height: 20px; stroke: #D32F2F; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span style="color: #5A3A40; font-size: 13px; font-weight: 600;">Please provide a valid, active email address (e.g., yourname@domain.com).</span>
                    </div>
                `;
                errorEl.style.display = 'block';
            }
            if (emailInput) {
                emailInput.style.border = '2px solid #FF8DA1';
                emailInput.style.backgroundColor = '#FFF5F7';
            }
            return;
        }

        // Profanity filter regex
        const profanityRegex = /\b(fuck|fucking|fucked|fucker|shit|shitting|bitch|bitches|bitching|asshole|bastard|cunt|dick|pussy|whore|slut|motherfucker|cock|crap|damn|bullshit|dumbass|douchebag)\b/i;

        if (profanityRegex.test(name) || profanityRegex.test(message)) {
            if (errorEl) {
                errorEl.innerHTML = `
                    <div style="background: #FFF0F2; border: 2px solid #FF8DA1; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
                        <svg class="icon-inline" style="width: 20px; height: 20px; stroke: #D32F2F; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span style="color: #5A3A40; font-size: 13px; font-weight: 600;">Profanity or offensive language is not allowed. Please keep your message cozy & polite! 🌸</span>
                    </div>
                `;
                errorEl.style.display = 'block';
            }
            if (msgTextarea) {
                msgTextarea.style.border = '2px solid #FF8DA1';
                msgTextarea.style.backgroundColor = '#FFF5F7';
            }
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('message', message);
            
            const imageFile = document.getElementById('contact-image')?.files[0];
            if (imageFile) {
                if (imageFile.size > 2 * 1024 * 1024) {
                    if (errorEl) {
                        errorEl.innerHTML = `<div style="background: #FFF0F2; border: 2px solid #FF8DA1; border-radius: 12px; padding: 12px 16px;">Image size cannot exceed 2MB.</div>`;
                        errorEl.style.display = 'block';
                    }
                    return;
                }
                formData.append('image', imageFile);
            }

            const response = await fetch('/api/contact', {
                method: 'POST',
                body: formData // No Content-Type header needed, browser sets it automatically with boundaries
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                successEl.innerHTML = "Your cute message was sent! We'll reply within 24 hours. <svg class='icon-inline' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2'><circle cx='12' cy='12' r='2.5' class='icon-filled'/><circle cx='12' cy='6.5' r='2.5'/><circle cx='17' cy='10' r='2.5'/><circle cx='15.5' cy='16' r='2.5'/><circle cx='8.5' cy='16' r='2.5'/><circle cx='7' cy='10' r='2.5'></svg>";
                successEl.style.display = 'block';
                form.reset();
            } else {
                if (errorEl) {
                    errorEl.innerHTML = `
                        <div style="background: #FFF0F2; border: 2px solid #FF8DA1; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
                            <svg class="icon-inline" style="width: 20px; height: 20px; stroke: #D32F2F; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span style="color: #5A3A40; font-size: 13px; font-weight: 600;">${data.error || "Failed to send message."}</span>
                        </div>
                    `;
                    errorEl.style.display = 'block';
                }
            }
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = "A network error occurred. Please try again.";
                errorEl.style.display = 'block';
            }
        }
    },

    initContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        const currentUser = (window.auth && typeof window.auth.getUser === 'function') ? window.auth.getUser() : null;
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const emailStatus = document.getElementById('contact-email-status');

        if (currentUser && currentUser.email) {
            if (nameInput && currentUser.name) nameInput.value = currentUser.name;
            if (emailInput) {
                emailInput.value = currentUser.email;
                emailInput.readOnly = true;
                emailInput.style.backgroundColor = '#F7F4F6';
                emailInput.style.borderColor = '#A5D6A7';
            }
            if (emailStatus) {
                emailStatus.innerHTML = `
                    <span style="color: #2E7D32; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        ✓ Validated Account Email (${currentUser.email})
                    </span>
                `;
            }
        } else {
            if (emailStatus) {
                emailStatus.innerHTML = `
                    <span style="font-weight: 500; color: #7A656C;">🔒 Only validated, registered account emails can send support inquiries.</span>
                `;
            }
        }

        contactForm.addEventListener('submit', this.handleContactSubmit);
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

        document.addEventListener('keydown', (e) => {
            const lb = document.getElementById('lightbox-modal');
            if (lb && lb.classList.contains('active')) {
                if (e.key === 'ArrowLeft') {
                    this.prevLightboxImage();
                } else if (e.key === 'ArrowRight') {
                    this.nextLightboxImage();
                } else if (e.key === 'Escape') {
                    this.closeLightbox();
                }
            }
        });
        
        this.initContactForm();
        this.setupHotspots();
    }
};

app.PRODUCTS = PRODUCTS;
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
