const views = {
    home: () => `<h1>Приветствуем в нашем магазине!</h1><p>Лучшие товары здесь.</p>`,
    
    catalog: () => `<h1>Каталог</h1><p>Список товаров скоро появится...</p>`,
    
    cart: () => `<h1>Корзина</h1><p>Ваша корзина пуста.</p>`,
    
    favorites: () => `<h1>Избранное</h1><p>Вы еще ничего не добавили.</p>`,

    login: () => `
        <h1>Вход</h1>
        <form id="loginForm" class="card">
            <div class="form-row">
                <label>Email или Логин</label>
                <input id="login-email" type="text" placeholder="Введите ваш email" required />
            </div>
            <div class="form-row">
                <label>Пароль</label>
                <input id="login-password" type="password" placeholder="••••••••" required />
            </div>
            <div id="login-message" class="message"></div>
            
            <button class="button" type="submit">Войти</button>

            <div class="form-footer" style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
                <p>Ещё нет аккаунта? 
                    <a href="#register" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">
                        Зарегистрироваться
                    </a>
                </p>
            </div>
        </form>`,

    register: () => `
        <h1>Регистрация</h1>
        <form id="registerForm" class="card">
            <div class="form-row"><label>Имя</label><input id="reg-name" type="text" required /></div>
            <div class="form-row"><label>Email</label><input id="reg-email" type="email" required /></div>
            <div class="form-row"><label>Пароль</label><input id="reg-password" type="password" required /></div>
            <div id="register-message" class="message"></div>
            
            <button class="button" type="submit">Создать аккаунт</button>

            <div class="form-footer" style="margin-top: 20px; text-align: center; font-size: 0.9rem;">
                <p>Уже есть профиль? 
                    <a href="#login" style="color: var(--primary-color); text-decoration: none; font-weight: 600;">
                        Войти
                    </a>
                </p>
            </div>
        </form>`,

    profile: (user) => `
        <h1>Профиль</h1>
        <div class="card">
            <p><strong>Имя:</strong> ${user.name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
        </div>
        <button id="logoutBtn" class="button secondary">Выйти</button>`
};
