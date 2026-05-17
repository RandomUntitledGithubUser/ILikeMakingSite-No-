// Application Logic Engine
let currentAdminTab = 'items';
let cataloguePage = 0;
let catalogueLoading = false;
let catalogueHasMore = true;
let catalogueFilter = { search: '', category: 'all', sortBy: 'createdAt', direction: 'desc' };
let carouselInterval = null;

// Auth Fetch Helpers
function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return token ? { "Authorization": "Bearer " + token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/users/me', { headers: getAuthHeaders() });
        return await res.json();
    } catch (e) {
        return { authenticated: false };
    }
}

// Router Setup
async function navigate(path) {
    window.history.pushState({}, "", path);
    await route(path);
}

window.onpopstate = () => route(window.location.pathname);

async function route(path) {
    clearInterval(carouselInterval);
    window.onscroll = null; // Reset infinite scroll binding
    
    const appContainer = document.getElementById("app");
    const userStatus = await checkAuthStatus();

    // Guard Conditions
    const protectedRoutes = ['/cart', '/favorites', '/admin', '/profile'];
    if (protectedRoutes.some(r => path.startsWith(r)) && !userStatus.authenticated) {
        return navigate('/login');
    }
    if (path.startsWith('/admin') && !userStatus.isAdmin) {
        return navigate('/');
    }

    // Home Path Routing
    if (path === "/" || path === "") {
        try {
            const res = await fetch('/api/items/recent');
            const recentItems = await res.json();
            appContainer.innerHTML = Views.home(Views.carouselBlock(recentItems));
            startCarouselLogic();
        } catch(e) {
            appContainer.innerHTML = Views.home('');
        }
    } 
    // Catalogue Path Routing
    else if (path === "/catalogue") {
        appContainer.innerHTML = Views.catalogue();
        cataloguePage = 0;
        catalogueHasMore = true;
        document.getElementById("catalogueGrid").innerHTML = "";
        await fetchCataloguePage();
        setupInfiniteScroll();
    } 
    // Item Details View Route
    else if (path.startsWith("/catalogue/")) {
        const id = path.split("/")[2];
        const res = await fetch(`/api/items/${id}`);
        if(res.ok) {
            const item = await res.json();
            appContainer.innerHTML = Views.itemDetail(item);
        } else {
            appContainer.innerHTML = "<h3>Product not found</h3>";
        }
    } 
    // Cart Route View
    else if (path === "/cart") {
        const res = await fetch('/api/cart', { headers: getAuthHeaders() });
        const items = await res.json();
        appContainer.innerHTML = Views.cart(items);
    } 
    // Favorites Route View
    else if (path === "/favorites") {
        const res = await fetch('/api/favorites', { headers: getAuthHeaders() });
        const items = await res.json();
        appContainer.innerHTML = Views.favorites(items);
    } 
    // Admin Control Panel View
    else if (path === "/admin") {
        appContainer.innerHTML = Views.admin();
        await loadAdminData();
    }
    // Fallback Legacy Mapping
    else if (typeof routes !== 'undefined' && routes[path]) {
        appContainer.innerHTML = routes[path]();
    }
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
    document.getElementById("loadingIndicator").style.display = "block";

    let url = `/api/items?page=${cataloguePage}&size=8&sortBy=${catalogueFilter.sortBy}&direction=${catalogueFilter.direction}&search=${encodeURIComponent(catalogueFilter.search)}`;
    if (catalogueFilter.category !== 'all') {
        url += `&category=${encodeURIComponent(catalogueFilter.category)}`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        const grid = document.getElementById("catalogueGrid");
        
        if (data.content.length === 0) {
            catalogueHasMore = false;
        } else {
            data.content.forEach(item => {
                grid.insertAdjacentHTML('beforeend', Views.productCard(item));
            });
            cataloguePage++;
            catalogueHasMore = !data.last;
        }
    } catch (e) {
        console.error(e);
    } finally {
        catalogueLoading = false;
        document.getElementById("loadingIndicator").style.display = "none";
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
    if(res.ok) route('/cart');
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
                        <button onclick="openEditModal('items', ${item.id}, ${encodeURIComponent(JSON.stringify(item))})">Edit</button>
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
                        <button onclick="openEditModal('users', ${u.id}, ${encodeURIComponent(JSON.stringify(u))})">Edit</button>
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

// Global initialization override trigger
document.addEventListener("DOMContentLoaded", () => {
    route(window.location.pathname);
});
