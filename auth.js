// auth-api.js
const API_BASE = 'https://3c4a3f1e459fe588-176-60-22-251.serveousercontent.com/api/auth';

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
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  // data: { success, message, token }
  return data;
}

async function loginUser({ email, password }) {
  const payload = { emailOrUsername: email, password: password };
  // Запрос должен идти на /api/auth/login
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function fetchProfile(token) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'GET',
    headers: createHeaders(token),
  });

  if (res.status === 200) {
    // бэк возвращает ProfileResponse { username, email, createdAt }
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
    return { success: false, message: 'Failed to fetch profile' };
  }
}


window.registerUser = registerUser;
window.loginUser = loginUser;
window.fetchProfile = fetchProfile;
