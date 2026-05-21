const views = {
    carouselBlock: (recentItems) => {
        if (!recentItems || recentItems.length === 0) return '';
        return `
            <div class="carousel-container" id=\"homeCarousel\">
                ${recentItems.map((item, idx) => `
                    <div class=\"carousel-slide ${idx === 0 ? 'active' : ''}\" onclick=\"window.location.hash = 'catalogue/${item.id}'\">
                        <img src=\"${item.itemImageUrl || 'https://via.placeholder.com/150'}\" class=\"carousel-img\" />
                        <div class=\"carousel-info\">
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
        <div class=\"page-content\">
            ${carouselHTML}
            <h1>Welcome to TCG Cards Store</h1>
            <p>Find boosters, bundles, rare cards and custom merch here!</p>
            <a href=\"#catalogue\" class=\"btn\" style=\"text-decoration: none; display: inline-block;\">View Catalogue</a>
        </div>
    `,

    catalogue: () => `
        <h1>Product Catalogue</h1>
        <div class=\"catalogue-layout\">
            <aside class=\"filters-sidebar\">
                <h3>Filters</h3>
                <div class=\"form-group\">
                    <label>Search...</label>
                    <input type=\"text\" id=\"search-input\" placeholder=\"Card name...\" />
                </div>
            </aside>
            <section class=\"products-grid\" id=\"products-container\"></section>
        </div>
    `,

    login: () => `
        <h1>Вход</h1>
        <form id=\"loginForm\" class=\"card\">
            <div class=\"form-row\"><label>Email или Имя</label><input id=\"login-email\" type=\"text\" required /></div>
            <div class=\"form-row\"><label>Пароль</label><input id=\"login-password\" type=\"password\" required /></div>
            <div id=\"login-message\" class=\"message\"></div>
            
            <button class=\"button\" type=\"submit\">Войти</button>
            <div class=\"form-footer\" style=\"margin-top: 20px; text-align: center; font-size: 0.9rem;\">
                <p style=\"margin-bottom: 8px;\"><a href=\"#forgot\" style=\"color: var(--primary-color); text-decoration: none;\">Забыли пароль?</a></p>
                <p>Ещё нет аккаунта? <a href=\"#register\" style=\"color: var(--primary-color); text-decoration: none; font-weight: 600;\">Зарегистрироваться</a></p>
            </div>
        </form>`,

    register: () => `
        <h1>Регистрация</h1>
        <form id=\"registerForm\" class=\"card\">
            <div class=\"form-row\"><label>Имя</label><input id=\"reg-name\" type=\"text\" minlength=\"3\" maxlength=\"20\" required /></div>
            <div class=\"form-row\"><label>Email</label><input id=\"reg-email\" type=\"email\" required /></div>
            <div class=\"form-row\"><label>Пароль</label><input id=\"reg-password\" type=\"password\" minlength=\"6\" required /></div>
            <div class=\"form-row\"><label>Подтвердите пароль</label><input id=\"reg-password-confirm\" type=\"password\" required /></div>
            
            <div class=\"password-strength-container\" style=\"margin-bottom: 15px;\">
                <div style=\"background: #e2e8f0; border-radius: 4px; height: 8px; width: 100%; overflow: hidden;\">
                    <div id=\"strength-bar\" style=\"height: 100%; width: 0%; transition: all 0.3s ease; background-color: #ef4444;\"></div>
                </div>
                <small id=\"strength-text\" style=\"display: block; margin-top: 5px; font-weight: 600; color: var(--text-muted);\">Введите пароль</small>
            </div>

            <div id=\"register-message\" class=\"message\"></div>
            <button class=\"button\" type=\"submit\">Создать аккаунт</button>
            <div class=\"form-footer\" style=\"margin-top: 20px; text-align: center; font-size: 0.9rem;\">
                <p>Уже есть профиль? <a href=\"#login\" style=\"color: var(--primary-color); text-decoration: none; font-weight: 600;\">Войти</a></p>
            </div>
        </form>`,

    forgot: () => `
        <h1>Восстановление пароля</h1>
        <form id=\"forgotForm\" class=\"card\">
            <p style=\"margin-bottom: 15px; color: var(--text-muted); text-align: center;\">Введите ваш Email, и мы отправим ссылку для сброса пароля.</p>
            <div class=\"form-row\"><label>Email</label><input id=\"forgot-email\" type=\"email\" required /></div>
            <div id=\"forgot-message\" class=\"message\"></div>
            <button class=\"button\" type=\"submit\">Отправить ссылку</button>
            <div class=\"form-footer\" style=\"margin-top: 20px; text-align: center; font-size: 0.9rem;\">
                <p><a href=\"#login\" style=\"color: var(--primary-color); text-decoration: none; font-weight: 600;\">Вернуться назад</a></p>
            </div>
        </form>`,

    reset: () => `
        <h1>Новый пароль</h1>
        <form id=\"resetForm\" class=\"card\">
            <p style=\"margin-bottom: 15px; color: var(--text-muted); text-align: center;\">Придумайте новый сложный пароль.</p>
            <div class=\"form-row\"><label>Новый пароль</label><input id=\"reset-password\" type=\"password\" minlength=\"6\" required /></div>
            <div class=\"form-row\"><label>Подтвердите пароль</label><input id=\"reset-password-confirm\" type=\"password\" required /></div>
            
            <div class=\"password-strength-container\" style=\"margin-bottom: 15px;\">
                <div style=\"background: #e2e8f0; border-radius: 4px; height: 8px; width: 100%; overflow: hidden;\">
                    <div id=\"strength-bar\" style=\"height: 100%; width: 0%; transition: all 0.3s ease; background-color: #ef4444;\"></div>
                </div>
                <small id=\"strength-text\" style=\"display: block; margin-top: 5px; font-weight: 600; color: var(--text-muted);\">Введите пароль</small>
            </div>

            <div id=\"reset-message\" class=\"message\"></div>
            <button class=\"button\" type=\"submit\">Сохранить изменения</button>
        </form>`,

    profile: (user) => `
        <h1>Профиль пользователя</h1>
        <div class=\"card\">
            <p><strong>Имя:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Дата регистрации:</strong> ${new Date(user.registeredAt).toLocaleDateString()}</p>
        </div>
    `
};
