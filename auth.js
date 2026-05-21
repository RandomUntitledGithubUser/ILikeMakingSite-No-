(function() {
  let token = null;

  // Вариант 1: Если токен пришел в хэше (старый формат #reset?token=XXX)
  if (window.location.hash.includes('token=')) {
    const hashParts = window.location.hash.split('?');
    const cleanHash = hashParts[0]; // Получаем чистый хэш (например, #reset)
    const params = new URLSearchParams(hashParts[1]);
    token = params.get('token');
    
    if (token) {
      localStorage.setItem('resetPasswordTokenFromUrl', token);
      // Срочно чистим хэш, чтобы app.js не выдал пустую страницу, а штатно загрузил вьюху
      window.location.hash = cleanHash;
    }
  } 
  // Вариант 2: Если токен пришел в query-параметрах (новый формат ?token=XXX#reset)
  else if (window.location.search.includes('token=')) {
    const params = new URLSearchParams(window.location.search);
    token = params.get('token');
    if (token) {
      localStorage.setItem('resetPasswordTokenFromUrl', token);
    }
  }
})();

// auth-api.js
const API_BASE = 'https://a7d63ace255ba652-176-60-52-155.serveousercontent.com/api/auth';

function createHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true' 
  };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

async function registerUser({ name, email, password }) {
  const payload = { username: name, email: email, password: password };
  
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return { success: false, message: `Ошибка сервера: Статус ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}

async function loginUser({ email, password }) {
  const payload = { emailOrUsername: email, password: password };
  
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return { success: false, message: `Ошибка сервера: Статус ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}

async function fetchProfile(token) {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'GET',
      headers: createHeaders(token),
    });

    if (res.status === 200) {
      const data = await res.json();
      return {
        success: true,
        user: {
          name: data.username,
          email: data.email,
          registeredAt: data.createdAt,
          isAdmin: data.isAdmin
        }
      };
    } else {
      return { success: false, message: 'Не удалось загрузить профиль' };
    }
  } catch (error) {
    return { success: false, message: 'Ошибка сети' };
  }
}

/**
 * Отправка запроса на восстановление пароля (генерация токена)
 */
async function forgotUserPassword(email) {
  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ email: email })
    });
    if (!res.ok) {
      return { success: false, message: `Ошибка сервера: Статус ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}

/**
 * Сброс пароля с использованием полученного токена
 */
async function resetUserPassword(token, password) {
  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ token: token, password: password })
    });
    if (!res.ok) {
      return { success: false, message: `Ошибка сервера: Статус ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}

// === АВТОМАТИЧЕСКАЯ ПОДСТАНОВКА ТОКЕНА В ФОРМУ ===
function autoFillResetTokenField() {
  const savedToken = localStorage.getItem('resetPasswordTokenFromUrl');
  if (savedToken) {
    const tokenInput = document.getElementById('reset-token');
    if (tokenInput) {
      tokenInput.value = savedToken;
      // Очищаем хранилище, чтобы токен не подставлялся повторно при простых переходах по сайту
      localStorage.removeItem('resetPasswordTokenFromUrl'); 
    }
  }
}

// Навешиваем слушатели событий для SPA-переключений
window.addEventListener('DOMContentLoaded', autoFillResetTokenField);
window.addEventListener('hashchange', autoFillResetTokenField);

// Интервал-подстраховка на случай задержек динамического рендеринга чистым JS
setInterval(autoFillResetTokenField, 250);

// Глобальный экспорт для app.js
window.registerUser = registerUser;
window.loginUser = loginUser;
window.fetchProfile = fetchProfile;
window.forgotUserPassword = forgotUserPassword;
window.resetUserPassword = resetUserPassword;
