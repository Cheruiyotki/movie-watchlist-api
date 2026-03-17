const STORAGE_KEYS = {
  token: "movie_orbit_token",
  user: "movie_orbit_user",
};

const state = {
  token: localStorage.getItem(STORAGE_KEYS.token) || "",
  user: JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null"),
  movies: [],
  watchlistItems: [],
};

const elements = {
  registerForm: document.getElementById("registerForm"),
  loginForm: document.getElementById("loginForm"),
  logoutButton: document.getElementById("logoutButton"),
  authStateText: document.getElementById("authStateText"),
  sessionPanel: document.getElementById("sessionPanel"),
  sessionText: document.getElementById("sessionText"),
  moviesGrid: document.getElementById("moviesGrid"),
  watchlistGrid: document.getElementById("watchlistGrid"),
  toast: document.getElementById("toast"),
};

const STATUS_OPTIONS = ["PLANNED", "WATCHING", "WATCHED"];

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const showToast = (message, isError = false) => {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.style.background = isError ? "#7e2914" : "#152126";
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3000);
};

const apiRequest = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
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

const storeSession = () => {
  if (state.token && state.user) {
    localStorage.setItem(STORAGE_KEYS.token, state.token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
};

const setSessionFromAuthPayload = (payload) => {
  state.token = payload?.data?.token || "";
  state.user = payload?.data?.user || null;
  storeSession();
  renderAuthState();
};

const clearSession = () => {
  state.token = "";
  state.user = null;
  state.watchlistItems = [];
  storeSession();
  renderAuthState();
  renderWatchlist();
  renderMovies();
};

const renderAuthState = () => {
  if (!state.user || !state.token) {
    elements.authStateText.textContent = "Sign in to manage your watchlist.";
    elements.sessionPanel.classList.add("hidden");
    return;
  }

  const name = state.user.name || state.user.email || "User";
  elements.authStateText.textContent = "You are signed in.";
  elements.sessionText.textContent = `Signed in as ${name}`;
  elements.sessionPanel.classList.remove("hidden");
};

const formatYear = (value) => {
  if (!value) return "Unknown year";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown year";
  return String(date.getFullYear());
};

const renderMovies = () => {
  if (!state.movies.length) {
    elements.moviesGrid.innerHTML =
      '<p class="muted">No movies found. Seed the database and refresh.</p>';
    return;
  }

  const disabled = !state.token ? "disabled" : "";
  const disabledText = !state.token ? "Login required to add movies." : "";

  elements.moviesGrid.innerHTML = state.movies
    .map((movie) => {
      const poster = movie.posterUrl
        ? `<img class="movie-cover" src="${escapeHtml(movie.posterUrl)}" alt="${escapeHtml(movie.title)} poster" loading="lazy" />`
        : '<div class="movie-cover" aria-hidden="true"></div>';
      const genres = Array.isArray(movie.genres) ? movie.genres.join(", ") : "";
      const overview = movie.overview || "No overview yet.";

      return `
        <article class="movie-card">
          ${poster}
          <div class="movie-top">
            <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
            <span class="badge">${formatYear(movie.releaseYear)}</span>
          </div>
          <p class="meta-line">${escapeHtml(genres || "No genres")} | ${movie.runtime || "?"} min</p>
          <p class="movie-overview">${escapeHtml(overview)}</p>
          <form class="add-watchlist-form" data-movie-id="${movie.id}">
            <div class="inline-grid">
              <label>
                Status
                <select name="status" ${disabled}>
                  ${STATUS_OPTIONS.map((status) => `<option value="${status}">${status}</option>`).join("")}
                </select>
              </label>
              <label>
                Rating (1-10)
                <input name="rating" type="number" min="1" max="10" ${disabled} />
              </label>
              <label>
                Notes
                <input name="notes" type="text" maxlength="500" ${disabled} />
              </label>
            </div>
            <button type="submit" ${disabled}>Add To Watchlist</button>
            <p class="muted">${disabledText}</p>
          </form>
        </article>
      `;
    })
    .join("");
};

const renderWatchlist = () => {
  if (!state.token) {
    elements.watchlistGrid.innerHTML =
      '<p class="muted">Log in to view and manage your watchlist.</p>';
    return;
  }

  if (!state.watchlistItems.length) {
    elements.watchlistGrid.innerHTML =
      '<p class="muted">Your watchlist is empty. Add a movie from the section above.</p>';
    return;
  }

  elements.watchlistGrid.innerHTML = state.watchlistItems
    .map((item) => {
      const movie = item.movie || {};
      return `
        <article class="watchlist-card">
          <h3>${escapeHtml(movie.title || "Untitled Movie")}</h3>
          <p class="meta-line">
            ${formatYear(movie.releaseYear)} | ${movie.runtime || "?"} min
          </p>
          <form class="update-watchlist-form" data-item-id="${item.id}">
            <div class="inline-grid">
              <label>
                Status
                <select name="status">
                  ${STATUS_OPTIONS.map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select>
              </label>
              <label>
                Rating
                <input name="rating" type="number" min="1" max="10" value="${item.rating ?? ""}" />
              </label>
              <label class="wide">
                Notes
                <textarea name="notes" rows="3" maxlength="500">${escapeHtml(item.notes || "")}</textarea>
              </label>
            </div>
            <div class="watchlist-actions">
              <button type="submit">Save Changes</button>
              <button type="button" class="remove" data-remove-id="${item.id}">Remove</button>
            </div>
          </form>
        </article>
      `;
    })
    .join("");
};

const loadMovies = async () => {
  elements.moviesGrid.innerHTML = '<p class="muted">Loading movies...</p>';
  try {
    const response = await apiRequest("/movies");
    state.movies = response?.data?.movies || [];
    renderMovies();
  } catch (error) {
    elements.moviesGrid.innerHTML =
      '<p class="muted">Could not load movies right now.</p>';
    showToast(error.message, true);
  }
};

const loadWatchlist = async () => {
  if (!state.token) {
    renderWatchlist();
    return;
  }

  elements.watchlistGrid.innerHTML = '<p class="muted">Loading watchlist...</p>';
  try {
    const response = await apiRequest("/watchlist");
    state.watchlistItems = response?.data?.watchlistItems || [];
    renderWatchlist();
  } catch (error) {
    state.watchlistItems = [];
    renderWatchlist();
    showToast(error.message, true);
  }
};

const toOptionalNumber = (value) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const number = Number(text);
  if (Number.isNaN(number)) return undefined;
  return number;
};

elements.registerForm.addEventListener("submit", async (event) => {
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
    setSessionFromAuthPayload(response);
    showToast("Registration successful.");
    event.currentTarget.reset();
    await loadWatchlist();
    renderMovies();
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
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
    setSessionFromAuthPayload(response);
    showToast("Welcome back.");
    event.currentTarget.reset();
    await loadWatchlist();
    renderMovies();
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // We still clear local session if API logout fails.
  }

  clearSession();
  showToast("Logged out.");
});

document.addEventListener("submit", async (event) => {
  const addForm = event.target.closest(".add-watchlist-form");
  if (addForm) {
    event.preventDefault();
    const formData = new FormData(addForm);
    const rating = toOptionalNumber(formData.get("rating"));
    const notes = String(formData.get("notes") || "").trim();

    const payload = {
      movieId: addForm.dataset.movieId,
      status: String(formData.get("status") || "PLANNED"),
    };

    if (rating !== undefined) payload.rating = rating;
    if (notes) payload.notes = notes;

    try {
      await apiRequest("/watchlist", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("Added to watchlist.");
      addForm.reset();
      await loadWatchlist();
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }

  const updateForm = event.target.closest(".update-watchlist-form");
  if (updateForm) {
    event.preventDefault();
    const formData = new FormData(updateForm);
    const rating = toOptionalNumber(formData.get("rating"));
    const payload = {
      status: String(formData.get("status") || "PLANNED"),
      notes: String(formData.get("notes") || "").trim(),
    };

    if (rating !== undefined) payload.rating = rating;

    try {
      await apiRequest(`/watchlist/${updateForm.dataset.itemId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast("Watchlist item updated.");
      await loadWatchlist();
    } catch (error) {
      showToast(error.message, true);
    }
  }
});

document.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-id]");
  if (!removeButton) return;

  const itemId = removeButton.dataset.removeId;
  if (!itemId) return;

  try {
    await apiRequest(`/watchlist/${itemId}`, { method: "DELETE" });
    showToast("Removed from watchlist.");
    await loadWatchlist();
  } catch (error) {
    showToast(error.message, true);
  }
});

const init = async () => {
  renderAuthState();
  renderMovies();
  renderWatchlist();
  await loadMovies();
  await loadWatchlist();
};

init();
