const router = {
    navigate(view) {
        // Скрываем все экраны
        document.querySelectorAll('.spa-view').forEach(section => section.style.display = 'none');
        
        // Показываем нужный
        const activeView = document.getElementById(`view-${view}`);
        if (activeView) activeView.style.display = 'block';

        if (view === 'profile') loadProfileData();
    }
};

// --- ЛОГИКА ВХОДА ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const msg = document.getElementById('login-message');

    const result = await loginUser({ email, password });
    if (result.success) {
        localStorage.setItem('authToken', result.token);
        router.navigate('profile');
    } else {
        msg.textContent = result.message;
        msg.className = 'message error';
    }
});

// --- ЛОГИКА РЕГИСТРАЦИИ ---
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const msg = document.getElementById('register-message');

    const result = await registerUser({ name, email, password });
    if (result.success) {
        localStorage.setItem('authToken', result.token);
        router.navigate('profile');
    } else {
        msg.textContent = result.message;
        msg.className = 'message error';
    }
});

// --- ЛОГИКА ПРОФИЛЯ ---
async function loadProfileData() {
    const token = localStorage.getItem('authToken');
    const container = document.getElementById('profile-content');

    if (!token) return router.navigate('login');

    const result = await fetchProfile(token);
    if (result.success) {
        container.innerHTML = `
            <p><strong>Имя:</strong> ${result.user.name}</p>
            <p><strong>Email:</strong> ${result.user.email}</p>
            <p><strong>Дата регистрации:</strong> ${new Date(result.user.registeredAt).toLocaleString()}</p>
        `;
    } else {
        localStorage.removeItem('authToken');
        router.navigate('login');
    }
}

// Выход
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    router.navigate('login');
});

// При загрузке проверяем, залогинен ли юзер
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('authToken')) {
        router.navigate('profile');
    } else {
        router.navigate('login');
    }
});