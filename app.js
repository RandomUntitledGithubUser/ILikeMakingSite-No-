const API_BASE = 'https://87ccf236caac8720-176-60-55-198.serveousercontent.com/api';

// Application Logic Engine
let currentAdminTab = 'items';
let cataloguePage = 0;
let catalogueLoading = false;
let catalogueHasMore = true;
let catalogueFilter = { search: '', category: 'all', sortBy: 'createdAt', direction: 'desc' };
let carouselInterval = null;

// Мост для совместимости регистра букв (views из views.js -> Views в app.js) и алиасов каталога
if (typeof views !== 'undefined') {
    window.Views = views;
    if (!views.catalogue && views.catalog) {
        views.catalogue = views.catalog;
    }
}

// Auth Fetch Helpers
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
                isAdmin: result.user && (result.user.isAdmin || result.user.name === 'admin')
            };
        }
    } catch (e) {
        console.error("Ошибка проверки сессии:", e);
    }
    return { authenticated: false, isAdmin: false };
}

// --- ОБЪЕКТ ROUTER ДЛЯ СОВМЕСТИМОСТИ С index.html НА ХЭШАХ ---
const router = {
    navigate(view) {
        // Устанавливаем хэш, что автоматически вызывает событие hashchange
        window.location.hash = view;
    }
};

// Переход по путям через хэш
async function navigate(hashPath) {
    window.location.hash = hashPath;
}

// Слушатель изменения хэша в URL
window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'home';
    route(view);
});

async function route(view) {
    clearInterval(carouselInterval);
    window.onscroll = null; // Сброс бесконечного скролла
    
    const appContainer = document.getElementById("app-content");
    if (!appContainer) return;

    const userStatus = await checkAuthStatus();

    // Защита роутов (Guard Conditions)
    const protectedViews = ['cart', 'favorites', 'admin', 'profile'];
    if (protectedViews.includes(view) && !userStatus.authenticated) {
        return navigate('login');
    }
    if (view === 'admin' && !userStatus.isAdmin) {
        return navigate('home');
    }

    // Если авторизован, не пускаем на страницы логина/регистрации
    if (userStatus.authenticated && (view === 'login' || view === 'register')) {
        return navigate('profile');
    }

    // Очистка строки от динамических ID (например, "catalogue/12") для базового роутинга
    const viewBase = view.split('/')[0];

    // Home Path Routing
    if (viewBase === "home" || viewBase === "") {
        try {
            const res = await fetch('${API_BASE}/items/recent');
            const recentItems = await res.json();
            appContainer.innerHTML = Views.home(Views.carouselBlock(recentItems));
            startCarouselLogic();
        } catch(e) {
            appContainer.innerHTML = Views.home('');
        }
    } 
    // Catalogue Path Routing
    else if (viewBase === "catalog" || viewBase === "catalogue") {
        appContainer.innerHTML = Views.catalogue();
        cataloguePage = 0;
        catalogueHasMore = true;
        const grid = document.getElementById("catalogueGrid");
        if (grid) grid.innerHTML = "";
        await fetchCataloguePage();
        setupInfiniteScroll();
    } 
    // Item Details View Route (пример хэша: #catalogue/12)
    else if (viewBase === "catalogue" && view.split("/")[1]) {
        const id = view.split("/")[1];
        const res = await fetch(`/api/items/${id}`);
        if(res.ok) {
            const item = await res.json();
            appContainer.innerHTML = Views.itemDetail(item);
        } else {
            appContainer.innerHTML = "<h3>Product not found</h3>";
        }
    } 
    // Cart Route View
    else if (viewBase === "cart") {
        const res = await fetch('${API_BASE}/cart', { headers: getAuthHeaders() });
        const items = await res.json();
        appContainer.innerHTML = Views.cart(items);
    } 
    // Favorites Route View
    else if (viewBase === "favorites") {
        const res = await fetch('${API_BASE}/favorites', { headers: getAuthHeaders() });
        const items = await res.json();
        appContainer.innerHTML = Views.favorites(items);
    } 
    // Admin Control Panel View
    else if (viewBase === "admin") {
        appContainer.innerHTML = Views.admin();
        await loadAdminData();
    }
    // Авторизация и ЛК
    else if (viewBase === "login") {
        appContainer.innerHTML = Views.login();
        initLogin();
    }
    else if (viewBase === "register") {
        appContainer.innerHTML = Views.register();
        initRegister();
    }
    else if (viewBase === "profile") {
        appContainer.innerHTML = Views.profile({ name: 'Загрузка...', email: '' });
        const token = localStorage.getItem('authToken');
        const result = await fetchProfile(token);
        if (result.success) {
            appContainer.innerHTML = Views.profile(result.user);
        } else {
            localStorage.removeItem('authToken');
            return navigate('login');
        }
    }
    // Fallback Legacy Mapping
    else if (typeof routes !== 'undefined' && routes[viewBase]) {
        appContainer.innerHTML = routes[viewBase]();
    }

    // Автоматически обновляем шапку при каждой смене страницы
    updateHeader();
}

// --- Carousel Core Engine ---
function startCarouselLogic() {
    const carousel = document.getElementById("homeCarousel");
    if (!carousel) return;
    const slides = carousel.querySelectorAll(".carousel-slide");
    if (slides.length <= 1) return;
    
    let currentSlide = 0;
    carouselInterval = setInterval(() => {
        slides[currentSlide].classList.remove("active");
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add("active");
    }, 5000);
}

// --- Catalogue View Filters & Scroll Actions ---
async function fetchCataloguePage() {
    if (catalogueLoading || !catalogueHasMore) return;
    catalogueLoading = true;
    const indicator = document.getElementById("loadingIndicator");
    if (indicator) indicator.style.display = "block";

    const itemsApiBase = API_BASE.replace('/auth', '/items');

    let url = `${itemsApiBase}?page=${cataloguePage}&size=8&sortBy=${catalogueFilter.sortBy}&direction=${catalogueFilter.direction}&search=${encodeURIComponent(catalogueFilter.search)}`;
    if (catalogueFilter.category !== 'all') {
        url += `&category=${encodeURIComponent(catalogueFilter.category)}`;
    }

    try {
        const token = localStorage.getItem('authToken');

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
            }
        });

        if (!res.ok) {
            throw new Error(`Ошибка сервера: ${res.status}`);
        }

        const data = await res.json();
        const grid = document.getElementById("catalogueGrid");
        
        if (data.content.length === 0) {
            catalogueHasMore = false;
        } else {
            data.content.forEach(item => {
                if (grid) grid.insertAdjacentHTML('beforeend', Views.productCard(item));
            });
            cataloguePage++;
            catalogueHasMore = !data.last;
        }
    } catch (e) {
        console.error("Ошибка загрузки каталога:", e);
    } finally {
        if (indicator) indicator.style.display = "none";
        catalogueLoading = false;
    }
}

function setupInfiniteScroll() {
    window.onscroll = () => {
        if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 100) {
            fetchCataloguePage();
        }
    };
}

let searchTimeout;
function triggerSearch(val) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        catalogueFilter.search = val;
        resetAndReloadCatalogue();
    }, 400);
}

function triggerCategory(val) {
    catalogueFilter.category = val;
    resetAndReloadCatalogue();
}

function triggerSort(val) {
    const parts = val.split("-");
    catalogueFilter.sortBy = parts[0];
    catalogueFilter.direction = parts[1];
    resetAndReloadCatalogue();
}

function resetAndReloadCatalogue() {
    cataloguePage = 0;
    catalogueHasMore = true;
    const grid = document.getElementById("catalogueGrid");
    if (grid) grid.innerHTML = "";
    fetchCataloguePage();
}

// --- Purchase Flow Actions ---
async function addToCart(itemId) {
    const res = await fetch(`/api/cart/add/${itemId}`, { method: 'POST', headers: getAuthHeaders() });
    if(res.ok) alert("Item added to cart!");
    else alert("Please login first.");
}

async function toggleFav(itemId) {
    const res = await fetch(`/api/favorites/toggle/${itemId}`, { method: 'POST', headers: getAuthHeaders() });
    if(res.ok) {
        const data = await res.json();
        alert(data.added ? "Added to favorites!" : "Removed from favorites!");
    } else {
        alert("Please login first.");
    }
}

async function updateQty(rowId, newQty) {
    if (newQty <= 0) {
        await removeFromCart(rowId);
        return;
    }
    const res = await fetch(`/api/cart/quantity/${rowId}?quantity=${newQty}`, { method: 'PUT', headers: getAuthHeaders() });
    if(res.ok) route('cart');
}

async function removeFromCart(rowId) {
    const res = await fetch(`/api/cart/remove/${rowId}`, { method: 'DELETE', headers: getAuthHeaders() });
    if(res.ok) document.getElementById(`cart-row-${rowId}`)?.remove();
}

async function removeFav(itemId, rowId) {
    const res = await fetch(`/api/favorites/toggle/${itemId}`, { method: 'POST', headers: getAuthHeaders() });
    if(res.ok) document.getElementById(`fav-row-${rowId}`)?.remove();
}

// --- Admin Subsystem Dash Management ---
async function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.getElementById("tabItemsBtn").classList.toggle("active", tab === 'items');
    document.getElementById("tabUsersBtn").classList.toggle("active", tab === 'users');
    await loadAdminData();
}

async function loadAdminData() {
    const th = document.getElementById("adminTh");
    const tbody = document.getElementById("adminTbody");
    if (!th || !tbody) return;
    th.innerHTML = ""; tbody.innerHTML = "";

    if (currentAdminTab === 'items') {
        th.innerHTML = "<th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Actions</th>";
        const res = await fetch('/api/admin/items', { headers: getAuthHeaders() });
        const items = await res.json();
        items.forEach(item => {
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.itemName}</td>
                    <td>${item.itemCategory}</td>
                    <td>${item.itemPrice}</td>
                    <td>
                        <button onclick="openEditModal('items', ${item.id}, '${encodeURIComponent(JSON.stringify(item))}')">Edit</button>
                        <button class="btn-danger" onclick="adminDelete('items', ${item.id})">Delete</button>
                    </td>
                </tr>
            `);
        });
    } else {
        th.innerHTML = "<th>ID</th><th>Username</th><th>Email</th><th>Is Admin</th><th>Actions</th>";
        const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
        const users = await res.json();
        users.forEach(u => {
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td>${u.admin ? 'Yes' : 'No'}</td>
                    <td>
                        <button onclick="openEditModal('users', ${u.id}, '${encodeURIComponent(JSON.stringify(u))}')">Edit</button>
                        <button class="btn-danger" onclick="adminDelete('users', ${u.id})">Delete</button>
                    </td>
                </tr>
            `);
        });
    }
}

async function adminDelete(type, id) {
    if (confirm("Вы уверены, что хотите это сделать?")) {
        const res = await fetch(`/api/admin/${type}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (res.ok) loadAdminData();
    }
}

// --- Admin Forms Creation & Editing Actions ---
let currentEditTarget = { type: '', id: null };

function openEditModal(type, id, entityEncoded) {
    const entity = JSON.parse(decodeURIComponent(entityEncoded));
    currentEditTarget = { type, id };
    document.getElementById("modalTitle").innerText = "Modify Details";
    const fields = document.getElementById("modalFields");
    fields.innerHTML = "";

    if (type === 'items') {
        fields.innerHTML = `
            <div class="form-group"><label>Name</label><input type="text" id="formItemName" value="${entity.itemName}" required /></div>
            <div class="form-group"><label>Category</label><input type="text" id="formItemCategory" value="${entity.itemCategory || ''}" required /></div>
            <div class="form-group"><label>Price</label><input type="number" step="0.01" id="formItemPrice" value="${entity.itemPrice}" required /></div>
            <div class="form-group"><label>Description</label><textarea id="formItemDesc">${entity.itemDesc || ''}</textarea></div>
            <div class="form-group"><label>Image URL</label><input type="text" id="formItemImg" value="${entity.itemImageUrl || ''}" /></div>
        `;
    } else {
        fields.innerHTML = `
            <div class="form-group"><label>Username</label><input type="text" id="formUserUsername" value="${entity.username}" required /></div>
            <div class="form-group"><label>Email</label><input type="email" id="formUserEmail" value="${entity.email}" required /></div>
            <div class="form-group"><label>Is Admin</label><select id="formUserAdmin"><option value="true" ${entity.admin ? 'selected':''}>Yes</option><option value="false" ${!entity.admin ? 'selected':''}>No</option></select></div>
        `;
    }
    document.getElementById("adminModal").style.display = "flex";
}

function openCreateModal() {
    if (currentAdminTab === 'users') {
        alert("User creation via admin panel is locked. Users must register standardly.");
        return;
    }
    currentEditTarget = { type: 'items', id: null };
    document.getElementById("modalTitle").innerText = "Add New Item";
    document.getElementById("modalFields").innerHTML = `
        <div class="form-group"><label>Name</label><input type="text" id="formItemName" required /></div>
        <div class="form-group"><label>Category</label><input type="text" id="formItemCategory" required /></div>
        <div class="form-group"><label>Price</label><input type="number" step="0.01" id="formItemPrice" required /></div>
        <div class="form-group"><label>Description</label><textarea id="formItemDesc"></textarea></div>
        <div class="form-group"><label>Image URL</label><input type="text" id="formItemImg" /></div>
    `;
    document.getElementById("adminModal").style.display = "flex";
}

function closeAdminModal() {
    document.getElementById("adminModal").style.display = "none";
}

async function saveAdminForm(e) {
    e.preventDefault();
    const { type, id } = currentEditTarget;
    let body = {};
    let url = `/api/admin/${type}`;
    let method = id ? 'PUT' : 'POST';

    if (id) url += `/${id}`;

    if (type === 'items') {
        body = {
            itemName: document.getElementById("formItemName").value,
            itemCategory: document.getElementById("formItemCategory").value,
            itemPrice: parseFloat(document.getElementById("formItemPrice").value),
            itemDesc: document.getElementById("formItemDesc").value,
            itemImageUrl: document.getElementById("formItemImg").value
        };
    } else {
        body = {
            username: document.getElementById("formUserUsername").value,
            email: document.getElementById("formUserEmail").value,
            admin: document.getElementById("formUserAdmin").value === "true"
        };
    }

    const res = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
    });

    if (res.ok) {
        closeAdminModal();
        loadAdminData();
    } else {
        alert("Save transaction failed.");
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СТРАНИЦ АВТОРИЗАЦИИ ---
function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const result = await loginUser({
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        });
        if (result.success) {
            localStorage.setItem('authToken', result.token);
            await navigate('profile');
        } else {
            const msg = document.getElementById('login-message');
            if (msg) {
                msg.textContent = result.message;
                msg.className = 'message error';
            }
        }
    });
}

function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const result = await registerUser({
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value
        });
        if (result.success) {
            localStorage.setItem('authToken', result.token);
            await navigate('profile');
        }
    });
}

function initLogout() {
    localStorage.removeItem('authToken');
    navigate('login');
}

function updateHeader() {
    const authZone = document.getElementById('auth-zone');
    if (!authZone) return;
    const token = localStorage.getItem('authToken');
    if (token) {
        authZone.innerHTML = `
            <a href="#" onclick="router.navigate('profile')" style="margin-right: 15px; color: var(--primary-color); text-decoration: none; font-weight: 600;">Профиль</a>
            <button class="button" onclick="initLogout()">Выйти</button>
        `;
    } else {
        authZone.innerHTML = `<button class="button" onclick="router.navigate('login')">Войти</button>`;
    }
}

// Первоначальный запуск роутинга при загрузке документа по текущему хэшу
document.addEventListener("DOMContentLoaded", () => {
    const startView = window.location.hash.replace('#', '') || 'home';
    route(startView);
});
