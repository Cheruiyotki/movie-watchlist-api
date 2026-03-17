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

if (!state.token || !state.user) {
  window.location.replace("/auth");
}

const elements = {
  sessionText: document.getElementById("sessionText"),
  logoutButton: document.getElementById("logoutButton"),
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

const clearSessionAndRedirect = async () => {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  window.location.replace("/auth");
};

const apiRequest = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${state.token}`,
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

  if (response.status === 401) {
    await clearSessionAndRedirect();
    throw new Error("Session expired. Please log in again.");
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

const formatYear = (value) => {
  if (!value) return "Unknown year";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown year";
  return String(date.getFullYear());
};

const renderSession = () => {
  const name = state.user?.name || state.user?.email || "User";
  elements.sessionText.textContent = `Signed in as ${name}`;
};

const renderMovies = () => {
  if (!state.movies.length) {
    elements.moviesGrid.innerHTML =
      '<p class="muted">No movies found. Seed the database and refresh.</p>';
    return;
  }

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
                <select name="status">
                  ${STATUS_OPTIONS.map((status) => `<option value="${status}">${status}</option>`).join("")}
                </select>
              </label>
              <label>
                Rating (1-10)
                <input name="rating" type="number" min="1" max="10" />
              </label>
              <label>
                Notes
                <input name="notes" type="text" maxlength="500" />
              </label>
            </div>
            <button type="submit">Add To Watchlist</button>
          </form>
        </article>
      `;
    })
    .join("");
};

const renderWatchlist = () => {
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
  elements.watchlistGrid.innerHTML = '<p class="muted">Loading watchlist...</p>';
  try {
    const response = await apiRequest("/watchlist");
    const items =
      response?.data?.watchlistItems ??
      response?.data?.watchlist ??
      response?.watchlistItems ??
      [];
    state.watchlistItems = Array.isArray(items) ? items : [];
    renderWatchlist();
  } catch (error) {
    elements.watchlistGrid.innerHTML = `<p class="muted">Could not load watchlist: ${escapeHtml(error.message)}</p>`;
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

elements.logoutButton?.addEventListener("click", async () => {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // If logout API fails, we still clear local state and redirect.
  }

  await clearSessionAndRedirect();
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
  renderSession();
  renderMovies();
  renderWatchlist();
  await loadMovies();
  await loadWatchlist();
};

init();
