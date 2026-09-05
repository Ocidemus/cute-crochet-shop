// Secure Authentication Helper for Cute Crochet Shop

const API_BASE = window.location.origin;

const auth = {
    getToken() {
        return localStorage.getItem('crochet_auth_token');
    },

    getUser() {
        const userStr = localStorage.getItem('crochet_user_profile');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Basic JWT expiry check on frontend
        try {
            const payloadPart = token.split('.')[1];
            const payload = JSON.parse(atob(payloadPart));
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    async sendOTP(email) {
        const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP code.');
        }
        return data;
    },

    async register(username, email, password, otp_code = '') {
        const response = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, otp_code })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        localStorage.setItem('crochet_auth_token', data.token);
        localStorage.setItem('crochet_user_profile', JSON.stringify(data.user));
        
        // Sync local cart to server after registering
        await this.syncLocalCartToServer();
        return data.user;
    },

    async login(email, password) {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        localStorage.setItem('crochet_auth_token', data.token);
        localStorage.setItem('crochet_user_profile', JSON.stringify(data.user));
        
        // Sync local cart to server after logging in
        await this.syncLocalCartToServer();
        return data.user;
    },

    async getAuthConfig() {
        try {
            const response = await fetch(`${API_BASE}/api/auth/config`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn("Failed to load auth config from server:", e);
        }
        return { googleClientId: "" };
    },

    async googleAuth(credential) {
        const response = await fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Google authentication failed');
        }
        
        localStorage.setItem('crochet_auth_token', data.token);
        localStorage.setItem('crochet_user_profile', JSON.stringify(data.user));
        
        await this.syncLocalCartToServer();
        return data.user;
    },

    logout() {
        localStorage.removeItem('crochet_auth_token');
        localStorage.removeItem('crochet_user_profile');
        window.location.href = '/index.html';
    },

    async syncLocalCartToServer() {
        // No-op: cart resides in localStorage for unified client checkout
        return;
    },

    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            // Unauthorized (token expired or invalid)
            this.logout();
            throw new Error('Session expired, please log in again.');
        }
        
        return response;
    },

    updateNavigation() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        // Remove existing dynamic auth links
        const existingAuthItems = navLinks.querySelectorAll('.dynamic-auth');
        existingAuthItems.forEach(el => el.remove());
        
        const isAuthenticated = this.isAuthenticated();
        const user = this.getUser();
        
        if (isAuthenticated && user) {
            // Logged in user profile & logout
            const profileLi = document.createElement('li');
            profileLi.className = 'dynamic-auth user-profile';
            profileLi.innerHTML = `
                <a href="/profile.html" style="font-weight: 600; color: var(--primary-dark); margin-right: 12px; display: inline-flex; align-items: center; gap: 4px;">My Account (${user.name || user.username}) <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>
                <button class="logout-btn" onclick="auth.logout()" style="padding: 4px 12px; font-size: 12px;">Logout</button>
            `;
            navLinks.appendChild(profileLi);
        } else {
            // Login link
            const loginLi = document.createElement('li');
            loginLi.className = 'dynamic-auth';
            loginLi.innerHTML = `<a href="/login.html">Login / Register <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="4"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></a>`;
            navLinks.appendChild(loginLi);
        }
    }
};

// Export to window
window.auth = auth;

// Update navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    auth.updateNavigation();
});
