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
    } catch (e) {
        console.error("Ошибка проверки сессии:", e);
    }
    return { authenticated: false, isAdmin: false };
}

const router = {
    navigate(view) {
        window.location.hash = view;
    }
};

async function navigate(hashPath) {
    window.location.hash = hashPath;
}

window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'home';
    route(view);
});

// ЕДИНЫЙ РОУТЕР (СТАРАЯ СТРУКТУРА + ПОДДЕРЖКА QUERY PARAMS И НОВЫХ СТРАНИЦ)
async function route(viewWithParams) {
    clearInterval(carouselInterval);
    window.onscroll = null;
    
    const appContainer = document.getElementById("app-content");
    if (!appContainer) return;

    // Выделяем чистый путь и параметры (нужно для сброса пароля: reset?token=...)
    const cleanView = viewWithParams.split('?')[0];
    const queryString = viewWithParams.split('?')[1] || '';
    const urlParams = new URLSearchParams(queryString);

    const userStatus = await checkAuthStatus();

    // Проверка защищенных роутов
    const protectedViews = ['cart', 'favorites', 'admin', 'profile'];
    if (protectedViews.includes(cleanView) && !userStatus.authenticated) {
        return navigate('login');
    }
    if (cleanView === 'admin' && !userStatus.isAdmin) {
        return navigate('home');
    }
    if (userStatus.authenticated && (cleanView === 'login' || cleanView === 'register')) {
        return navigate('profile');
    }

    const viewParts = cleanView.split('/');
    const viewBase = viewParts[0];
    const dynamicId = viewParts[1];

    // Отрисовка страниц
    if (viewBase === "home" || viewBase === "") {
        try {
            const res = await fetch(`${API_BASE1}/items/recent`);
            const recentItems = await res.json();
            appContainer.innerHTML = Views.home(Views.carouselBlock(recentItems));
            startCarouselLogic();
        } catch(e) {
            appContainer.innerHTML = Views.home('');
        }
    } 
    else if ((viewBase === "catalog" || viewBase === "catalogue") && dynamicId) {
        const res = await fetch(`${API_BASE1}/items/${dynamicId}`);
        if(res.ok) {
            const item = await res.json();
            appContainer.innerHTML = Views.itemDetail(item);
        } else {
            appContainer.innerHTML = "<h3>Product not found</h3>";
        }
    } 
    else if (viewBase === "catalog" || viewBase === "catalogue") {
        appContainer.innerHTML = Views.catalogue();
        cataloguePage = 0;
        catalogueHasMore = true;
        const grid = document.getElementById("catalogueGrid");
        if (grid) grid.innerHTML = "";
        await fetchCataloguePage();
        setupInfiniteScroll();
    } 
    else if (viewBase === "cart") {
        const res = await fetch(`${API_BASE1}/cart`, { headers: getAuthHeaders() });
        if (!res.ok) {
            console.error("Ошибка загрузки корзины:", res.status);
            appContainer.innerHTML = `<h1>Ошибка ${res.status}</h1><p>Не удалось загрузить корзину.</p>`;
            return;
        }
        const items = await res.json();
        appContainer.innerHTML = Views.cart(items);
    } 
    else if (viewBase === "favorites") {
        const res = await fetch(`${API_BASE1}/favorites`, { headers: getAuthHeaders() });
        if (!res.ok) {
            console.error("Ошибка загрузки избранного:", res.status);
            appContainer.innerHTML = `<h1>Ошибка ${res.status}</h1><p>Не удалось загрузить избранное.</p>`;
            return;
        }
        const items = await res.json();
        appContainer.innerHTML = Views.favorites(items);
    } 
    else if (viewBase === "admin") {
        appContainer.innerHTML = Views.admin();
        await loadAdminData();
    }
    else if (viewBase === "login") {
        appContainer.innerHTML = Views.login();
        initLogin();
    }
    else if (viewBase === "register") {
        appContainer.innerHTML = Views.register();
        initRegister();
    }
    else if (viewBase === "forgot") {
        appContainer.innerHTML = Views.forgot();
        
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
    else if (viewBase === "reset") {
        const token = urlParams.get('token');
        if (!token) {
            appContainer.innerHTML = `<h1>Ошибка</h1><p class="card" style="color:red; text-align:center;">Токен восстановления не найден в URL ссылке.</p>`;
            return;
        }

        appContainer.innerHTML = Views.reset();
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
    else if (viewBase === "profile") {
        appContainer.innerHTML = Views.profile({ username: 'Загрузка...', email: '' });
        const token = localStorage.getItem('authToken');
        const result = await fetchProfile(token);
        if (result.success) {
            appContainer.innerHTML = Views.profile(result.user);
        } else {
            localStorage.removeItem('authToken');
            return navigate('login');
        }
    }
    else if (typeof routes !== 'undefined' && routes[viewBase]) {
        appContainer.innerHTML = routes[viewBase]();
    }

    await updateHeader();
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
            bar.style.backgroundColor = '#ef4444';
            text.textContent = 'Опасный (минимум 6 символов)';
            text.style.color = '#ef4444';
            return;
        }

        let score = 0;
        if (/[a-z]/.test(val)) score++;
        if (/[A-Z]
