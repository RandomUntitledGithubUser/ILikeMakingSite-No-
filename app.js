const API_BASE1 = 'https://30fdccdac4cd4d9b-176-60-22-144.serveousercontent.com/api';

let currentAdminTab = 'items';
let cataloguePage = 0;
let catalogueLoading = false;
let catalogueHasMore = true;
let catalogueFilter = { search: '', category: 'all', sortBy: 'createdAt', direction: 'desc' };
let carouselInterval = null;

if (typeof views !== 'undefined') {
    window.Views = views;
    if (!views.catalogue && views.catalog) {
        views.catalogue = views.catalog;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    return token ? { 
        "Authorization": "Bearer " + token, 
        "Content-Type": "application/json",
        "bypass-tunnel-reminder": "true" 
    } : { "Content-Type": "application/json" };
}

async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) return { authenticated: false, isAdmin: false };

    try {
        const result = await fetchProfile(token); 
        if (result.success) {
            return {
                authenticated: true,
                isAdmin: result.user.isAdmin === true || 
                         result.user.username === 'admin'
            };
        }
        return { authenticated: false, isAdmin: false };
    } catch(e) {
        return { authenticated: false, isAdmin: false };
    }
}

function initLogout() {
    localStorage.removeItem('authToken');
    updateHeader();
    window.location.hash = 'login';
}

async function updateHeader() {
    const authZone = document.getElementById('auth-zone');
    if (!authZone) return;
    
    const token = localStorage.getItem('authToken');
    if (token) {
        const auth = await checkAuthStatus();
        let adminButton = '';
        if (auth.isAdmin) {
            adminButton = `<a href="#admin" style="margin-right: 15px; color: #e74c3c; text-decoration: none; font-weight: 600;">Админка</a>`;
        }
        authZone.innerHTML = `
            ${adminButton}
            <a href="#profile" style="margin-right: 15px; color: var(--primary-color); text-decoration: none; font-weight: 600;">Профиль</a>
            <button class="button" style="display:inline-block; width:auto; padding:0.4rem 1rem;" onclick="initLogout()">Выйти</button>
        `;
    } else {
        authZone.innerHTML = `<a href="#login" class="button" style="text-decoration: none; display: inline-block; text-align: center; line-height: 2.4; padding:0 1.5rem;">Войти</a>`;
    }
}

// ФУНКЦИЯ ВАЛИДАЦИИ СЛОЖНОСТИ ПАРОЛЯ
function initPasswordStrengthListener(inputId) {
    const input = document.getElementById(inputId);
    const bar = document.getElementById('strength-bar');
    const text = document.getElementById('strength-text');
    
    if (!input || !bar || !text) return;

    input.addEventListener('input', () => {
        const val = input.value;
        if (!val) {
            bar.style.width = '0%';
            text.textContent = 'Введите пароль';
            text.style.color = 'var(--text-muted)';
            return;
        }

        if (val.length < 6) {
            bar.style.width = '25%';
            bar.style.backgroundColor = '#ef4444'; // Красный
            text.textContent = 'Опасный (минимум 6 символов)';
            text.style.color = '#ef4444';
            return;
        }

        let score = 0;
        if (/[a-z]/.test(val)) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        if (score === 1) {
            bar.style.width = '50%';
            bar.style.backgroundColor = '#f97316'; // Оранжевый
            text.textContent = 'Слабый';
            text.style.color = '#f97316';
        } else if (score === 2 || score === 3) {
            bar.style.width = '75%';
            bar.style.backgroundColor = '#eab308'; // Желтый
            text.textContent = 'Хороший';
            text.style.color = '#eab308';
        } else if (score === 4) {
            bar.style.width = '100%';
            bar.style.backgroundColor = '#10b981'; // Зеленый
            text.textContent = 'Отличный';
            text.style.color = '#10b981';
        }
    });
}

// ЕДИНЫЙ КОРНЕВОЙ РОУТЕР ДЛЯ SPA
async function handleRoute() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }

    const hash = window.location.hash || '#home';
    
    // Парсинг путей и query параметров (актуально для страницы сброса пароля #reset?token=...)
    const cleanHash = hash.split('?')[0];
    const queryString = hash.split('?')[1] || '';
    const urlParams = new URLSearchParams(queryString);

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    await updateHeader();

    if (cleanHash === '#home') {
        appContent.innerHTML = views.home('');
    } 
    else if (cleanHash === '#login') {
        appContent.innerHTML = views.login();
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const msg = document.getElementById('login-message');

            const result = await loginUser({ email, password });
            if (result.success) {
                localStorage.setItem('authToken', result.token);
                await updateHeader();
                window.location.hash = 'profile';
            } else {
                msg.textContent = result.message || "Ошибка авторизации";
                msg.className = 'message error';
            }
        });
    } 
    else if (cleanHash === '#register') {
        appContent.innerHTML = views.register();
        initPasswordStrengthListener('reg-password');

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-password-confirm').value;
            const msg = document.getElementById('register-message');

            // Проверка совпадения паролей
            if (password !== confirmPassword) {
                msg.textContent = "Пароли не совпадают!";
                msg.className = 'message error';
                return;
            }

            const result = await registerUser({ name, email, password });
            if (result.success) {
                alert("Регистрация успешна!");
                window.location.hash = 'login';
            } else {
                msg.textContent = result.message || "Ошибка регистрации";
                msg.className = 'message error';
            }
        });
    } 
    else if (cleanHash === '#forgot') {
        appContent.innerHTML = views.forgot();
        
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const msg = document.getElementById('forgot-message');
            msg.textContent = "Отправка ссылки...";
            msg.className = 'message';

            const result = await forgotPasswordAPI(email);
            if (result.success) {
                msg.textContent = result.message;
                msg.className = 'message success';
            } else {
                msg.textContent = result.message;
                msg.className = 'message error';
            }
        });
    } 
    else if (cleanHash === '#reset') {
        const token = urlParams.get('token');
        if (!token) {
            appContent.innerHTML = `<h1>Ошибка</h1><p class="card" style="color:red; text-align:center;">Токен восстановления не найден в URL ссылке.</p>`;
            return;
        }

        appContent.innerHTML = views.reset();
        initPasswordStrengthListener('reset-password');

        document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('reset-password').value;
            const confirmPassword = document.getElementById('reset-password-confirm').value;
            const msg = document.getElementById('reset-message');

            if (password !== confirmPassword) {
                msg.textContent = "Пароли не совпадают!";
                msg.className = 'message error';
                return;
            }

            const result = await resetPasswordAPI(token, password);
            if (result.success) {
                alert("Пароль успешно изменен! Войдите с новым паролем.");
                window.location.hash = 'login';
            } else {
                msg.textContent = result.message;
                msg.className = 'message error';
            }
        });
    }
    else if (cleanHash === '#profile') {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.hash = 'login';
            return;
        }
        const profileData = await fetchProfile(token);
        if (profileData.success) {
            appContent.innerHTML = views.profile(profileData.user);
        } else {
            localStorage.removeItem('authToken');
            window.location.hash = 'login';
        }
    } 
    else {
        // Заглушка для остальных разделов (каталог, корзина и др.)
        appContent.innerHTML = `<h1>Страница</h1><p class="card">Контент в разработке...</p>`;
    }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);
