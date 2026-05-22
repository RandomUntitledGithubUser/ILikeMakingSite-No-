const views = {
    carouselBlock: (recentItems) => {
        if (!recentItems || recentItems.length === 0) return '';
        return `
            <div class="carousel-container" id="homeCarousel">
                ${recentItems.map((item, idx) => `
                    <div class="carousel-slide ${idx === 0 ? 'active' : ''}" onclick="window.location.hash = 'catalogue/${item.id}'">
                        <img src="${item.itemImageUrl || 'https://via.placeholder.com/150'}" class="carousel-img" />
                        <div class="carousel-info">
                            <h2>${item.itemName}</h2>
                            <p>${item.itemPrice} USD</p>
                            <small>New Arrival!</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    home: (carouselHTML) => `
        <div class="page-content">
            ${carouselHTML}
            <h1>Welcome to TCG Cards Store</h1>
            <p>Find boosters, bundles, rare cards and custom merch here!</p>
            <a href="#catalogue" class="btn" style="text-decoration: none; display: inline-block;">View Catalogue</a>
        </div>
    `,

    catalogue: () => `
        <h1>Product Catalogue</h1>
        <div class="catalogue-layout">
            <aside class="filters-sidebar">
                <h3>Filters</h3>
                <div class="form-group">
                    <label>Search</label>
                    <input type="text" id="searchInp" placeholder="Search by name..." oninput="triggerSearch(this.value)" />
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="categorySel" onchange="triggerCategory(this.value)">
                        <option value="all">All Categories</option>
                        <option value="boosters">Booster Packs</option>
                        <option value="bundles">Bundles</option>
                        <option value="merch">Merchandise</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Sort By</label>
                    <select id="sortSel" onchange="triggerSort(this.value)">
                        <option value="createdAt-desc">Date: Newest First</option>
                        <option value="itemPrice-asc">Price: Low to High</option>
                        <option value="itemPrice-desc">Price: High to Low</option>
                    </select>
                </div>
            </aside>
            <div class="items-grid" id="catalogueGrid"></div>
        </div>
        <div id="loadingIndicator" style="text-align:center; padding:20px; display:none;">Loading more items...</div>
    `,

    productCard: (item, isFavorite = false) => `
        <div class="product-card" onclick="event.stopPropagation(); window.location.hash = 'catalogue/${item.id}'">
            <img src="${item.itemImageUrl || 'https://via.placeholder.com/150'}" />
            <h4>${item.itemName}</h4>
            <p>${item.itemPrice} USD</p>
            <div style="margin-top:10px; display:flex; gap:5px; justify-content:center;">
                <button class="btn-sm" onclick="event.stopPropagation(); addToCart(${item.id})">Купить+</button>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(${item.id}, this)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                </button>
            </div>
        </div>
    `,

    itemDetail: (item) => `
        <div class="detail-container" style="display:flex; gap:40px; margin-top:20px;">
            <img src="${item.itemImageUrl || 'https://via.placeholder.com/300'}" style="max-width:400px; object-fit:contain;" />
            <div>
                <h1>${item.itemName}</h1>
                <p><strong>Category:</strong> ${item.itemCategory}</p>
                <p style="font-size:20px; color:#28a745;"><strong>Price:</strong> ${item.itemPrice} USD</p>
                <p>${item.itemDesc || 'No description available.'}</p>
                <button class="btn" onclick="addToCart(${item.id})">Add to Cart</button>
                <button class="btn" onclick="toggleFav(${item.id})" style="background:#dc3545;">Add to Favorites</button>
                <br/><br/>
                <a href="#catalogue" class="btn-link" style="text-decoration: none; display: inline-block;">← Back to Catalogue</a>
            </div>
        </div>
    `,

    cart: (cartItems) => `
        <h1>Shopping Cart</h1>
        <div id="cartList">
            ${cartItems.length === 0 ? '<p>Your cart is empty.</p>' : cartItems.map(ci => `
                <div class="list-item-row" id="cart-row-${ci.id}">
                    <div class="list-item-left">
                        <img src="${ci.item.itemImageUrl || 'https://via.placeholder.com/100'}" />
                    </div>
                    <div class="list-item-right">
                        <div>
                            <h3>${ci.item.itemName}</h3>
                            <p style="font-size:14px; color:#555;">${ci.item.itemDesc || ''}</p>
                            <p><strong>${ci.item.itemPrice} USD</strong></p>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <button onclick="updateQty(${ci.id}, ${ci.quantity - 1})">-</button>
                            <span>${ci.quantity}</span>
                            <button onclick="updateQty(${ci.id}, ${ci.quantity + 1})">+</button>
                            <button class="btn-danger" onclick="removeFromCart(${ci.id})" style="margin-left:20px;">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        ${cartItems.length > 0 ? `
            <div style="margin-top:20px; text-align:right;">
                <h3>Total: ${cartItems.reduce((acc, c) => acc + (c.item.itemPrice * c.quantity), 0).toFixed(2)} USD</h3>
                <button class="btn" onclick="alert('Checkout stub activated!')">Proceed to Checkout</button>
            </div>
        ` : ''}
    `,

    favorites: (favItems) => `
        <h1>Your Favorites</h1>
        <div id="favList">
            ${favItems.length === 0 ? '<p>No favorites added yet.</p>' : favItems.map(fi => `
                <div class="list-item-row" id="fav-row-${fi.id}">
                    <div class="list-item-left">
                        <div class="favorite-page-heart">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" style="fill: var(--danger, #ef4444);">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </div>
                    </div>
                    <div class="list-item-right">
                        <div>
                            <h3>${fi.item.itemName}</h3>
                            <p>${fi.item.itemDesc || ''}</p>
                            <p><strong>${fi.item.itemPrice} USD</strong></p>
                        </div>
                        <div>
                            <button class="btn-danger" onclick="removeFav(${fi.item.id}, ${fi.id})">Remove From Favorites</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `,

    admin: () => `
        <h1>Admin Dashboard</h1>
        <div class="admin-tabs">
            <button class="tab-btn active" id="tabItemsBtn" onclick="switchAdminTab('items')">Manage Items</button>
            <button class="tab-btn" id="tabUsersBtn" onclick="switchAdminTab('users')">Manage Users</button>
        </div>
        <div style="margin-bottom:15px;">
            <button class="btn" id="adminCreateBtn" onclick="openCreateModal()">Add New Entry</button>
        </div>
        <table class="table" style="width:100%; text-align:left; border-collapse:collapse;" id="adminTable">
            <thead><tr id="adminTh"></tr></thead>
            <tbody id="adminTbody"></tbody>
        </table>
    `,


    profile: (user) => `
        <h1>Профиль</h1>
        <div class="card">
            <p><strong>Имя:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
        </div>
        <button id="logoutBtn" class="button secondary" onclick="initLogout()">Выйти</button>`
};

views.login = () => `
    <h1>Войти</h1>
    <form id="loginForm" class="card">
        <div class="form-row"><label>Email или Имя</label><input id="login-email" type="text" required /></div>
        <div class="form-row"><label>Пароль</label><input id="login-password" type="password" required /></div>
        <div id="login-message" class="message"></div>
        <button class="button" type="submit">Войти</button>
        <div class="form-footer" style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
            <p style="margin-bottom: 10px;"><a href="#forgot-password" style="color: var(--text-muted); text-decoration: none;">Забыли пароль?</a></p>
            <p>Ещё нет аккаунта? <a href="#register" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">Зарегистрироваться</a></p>
        </div>
    </form>
`,

views.register = () => `
    <h1>Регистрация</h1>
    <form id="registerForm" class="card">
        <div class="form-row"><label>Имя</label><input id="reg-name" type="text" minlength="3" maxlength="20" required /></div>
        <div class="form-row"><label>Email</label><input id="reg-email" type="email" required /></div>
        <div class="form-row">
            <label>Пароль</label>
            <input id="reg-password" type="password" minlength="6" required />
            <div class="password-strength-container" style="margin-top: 8px;">
                <div class="strength-bar-bg" style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div id="strength-bar" style="width: 0%; height: 100%; transition: all 0.3s ease; background: #64748b;"></div>
                </div>
                <small id="strength-text" style="font-size: 0.8rem; color: #64748b; display: block; margin-top: 4px;">Введите пароль (мин. 6 символов)</small>
            </div>
        </div>
        <div class="form-row">
            <label>Подтвердите пароль</label>
            <input id="reg-password-confirm" type="password" required placeholder="Повторите пароль" />
        </div>
        <div id="register-message" class="message"></div>
        
        <button class="button" type="submit">Создать аккаунт</button>
        <div class="form-footer" style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
            <p>Уже есть профиль? <a href="#login" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">Войти</a></p>
        </div>
    </form>
`,

views.forgotPassword = () => `
    <h1>Восстановление пароля</h1>
    <form id="forgotPasswordForm" class="card">
        <div class="form-row">
            <label>Email аккаунта</label>
            <input id="forgot-email" type="email" required placeholder="example@mail.com" />
        </div>
        <div id="forgot-message" class="message"></div>
        <button class="button" type="submit">Получить код сброса</button>
        <div class="form-footer" style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
            <p><a href="#login" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">Вернуться к авторизации</a></p>
        </div>
    </form>
`;

views.resetPassword = () => `
    <h1>Новый пароль</h1>
    <form id="resetPasswordForm" class="card">
        <div class="form-row">
            <label>Токен из письма</label>
            <input id="reset-token" type="text" required placeholder="Введите полученный токен" />
        </div>
        <div class="form-row">
            <label>Новый пароль</label>
            <input id="reset-password-field" type="password" minlength="6" required placeholder="Минимум 6 символов" />
            <div class="password-strength-container" style="margin-top: 8px;">
                <div class="strength-bar-bg" style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div id="reset-strength-bar" style="width: 0%; height: 100%; transition: all 0.3s ease; background: #64748b;"></div>
                </div>
                <small id="reset-strength-text" style="font-size: 0.8rem; color: #64748b; display: block; margin-top: 4px;">Введите пароль (мин. 6 символов)</small>
            </div>
        </div>
        
        <div class="form-row">
            <label>Подтвердите новый пароль</label>
            <input id="reset-password-confirm" type="password" required placeholder="Повторите новый пароль" />
        </div>
        
        <div id="reset-message" class="message"></div>
        <button class="button" type="submit">Сохранить новый пароль</button>
        <div class="form-footer" style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
            <p><a href="#login" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">К авторизации</a></p>
        </div>
    </form>
`;

views.notFound = () => `
    <div class="page-content" style="text-align: center; padding: 60px 20px;">
        <h1 style="font-size: 7rem; color: var(--text-muted); margin-bottom: 10px; line-height: 1;">404</h1>
        <h2 style="margin-bottom: 15px;">Страница не найдена</h2>
        <p style="color: var(--text-muted); margin-bottom: 30px;">Запрашиваемый вами адрес не существует или был удален.</p>
        <a href="#home" class="btn" style="text-decoration: none; display: inline-block;">Вернуться на главную</a>
    </div>
`;
