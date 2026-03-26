// auth-api.js
const API_BASE = 'https://7c60e707261363df-176-60-22-251.serveousercontent.com/api/auth';

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
          registeredAt: data.createdAt
        }
      };
    } else {
      return { success: false, message: 'Не удалось загрузить профиль' };
    }
  } catch (error) {
    return { success: false, message: 'Ошибка сети' };
  }
}

// Глобальный экспорт для app.js
window.registerUser = registerUser;
window.loginUser = loginUser;
window.fetchProfile = fetchProfile;
