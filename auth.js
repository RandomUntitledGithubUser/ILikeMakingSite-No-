// auth-api.js
const API_BASE = 'https://76006142c867419f-176-60-22-202.serveousercontent.com/api/auth';

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
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}

// Запрос ссылки восстановления пароля
async function forgotPasswordAPI(email) {
  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ email: email })
    });
    return await res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}

// Отправка нового пароля с токеном
async function resetPasswordAPI(token, password) {
  try {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ token: token, password: password })
    });
    return await res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return { success: false, message: "Сервер недоступен" };
  }
}
