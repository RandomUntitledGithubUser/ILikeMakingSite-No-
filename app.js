const router = {
    async navigate(view) {
        const token = localStorage.getItem('authToken');
        const content = document.getElementById('app-content');

 
        if (token && (view === 'login' || view === 'register')) {
            return this.navigate('profile'); 
        }
        if (!token && view === 'profile') {
            return this.navigate('login'); 
        }


        if (view === 'profile') {
            content.innerHTML = views.profile({ name: 'Загрузка...', email: '' });
            const result = await fetchProfile(token);[cite: 3]
            if (result.success) {
                content.innerHTML = views.profile(result.user);
                this.initLogout();
            } else {
                localStorage.removeItem('authToken');
                this.navigate('login');
            }
        } else {
            content.innerHTML = views[view] ? views[view]() : '404 Not Found';
        }

       
        if (view === 'login') this.initLogin();
        if (view === 'register') this.initRegister();

        this.updateHeader();
    },

    updateHeader() {
        const authZone = document.getElementById('auth-zone');
        const token = localStorage.getItem('authToken');
        
        if (token) {
            
            authZone.innerHTML = `<button class="button secondary" onclick="router.navigate('profile')">Личный кабинет</button>`;
        } else {
            authZone.innerHTML = `<button class="button" onclick="router.navigate('login')">Войти</button>`;
        }
    },

    initLogin() {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await loginUser({ 
                email: document.getElementById('login-email').value, 
                password: document.getElementById('login-password').value 
            });[cite: 3]
            if (result.success) {
                localStorage.setItem('authToken', result.token);
                this.navigate('profile');
            } else {
                const msg = document.getElementById('login-message');
                msg.textContent = result.message;
                msg.className = 'message error';
            }
        });
    },

    initRegister() {
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await registerUser({
                name: document.getElementById('reg-name').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value
            });[cite: 3]
            if (result.success) {
                localStorage.setItem('authToken', result.token);
                this.navigate('profile');
            }
        });
    },

    initLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) {
            btn.onclick = () => {
                localStorage.removeItem('authToken');
                this.navigate('login');
            };
        }
    }
};


window.addEventListener('DOMContentLoaded', () => {
    const startPage = localStorage.getItem('authToken') ? 'profile' : 'home';
    router.navigate(startPage);
});
