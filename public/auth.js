const STORAGE_KEYS = {
  token: "movie_orbit_token",
  user: "movie_orbit_user",
};

const state = {
  token: localStorage.getItem(STORAGE_KEYS.token) || "",
  user: JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null"),
};

if (state.token && state.user) {
  window.location.replace("/dashboard");
}

const elements = {
  registerForm: document.getElementById("registerForm"),
  loginForm: document.getElementById("loginForm"),
  toast: document.getElementById("toast"),
};

const showToast = (message, isError = false) => {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.style.background = isError ? "#7e2914" : "#152126";
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2500);
};

const apiRequest = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.errors ||
      payload?.message ||
      "Request failed. Please try again.";
    throw new Error(message);
  }

  return payload;
};

const persistSession = (authPayload) => {
  const token = authPayload?.data?.token || "";
  const user = authPayload?.data?.user || null;

  if (!token || !user) {
    throw new Error("Authentication succeeded but session payload is invalid.");
  }

  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
};

const redirectToDashboard = () => {
  window.location.replace("/dashboard");
};

elements.registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  };

  try {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    persistSession(response);
    showToast("Account created. Redirecting...");
    window.setTimeout(redirectToDashboard, 500);
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  };

  try {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    persistSession(response);
    showToast("Login successful. Redirecting...");
    window.setTimeout(redirectToDashboard, 500);
  } catch (error) {
    showToast(error.message, true);
  }
});
