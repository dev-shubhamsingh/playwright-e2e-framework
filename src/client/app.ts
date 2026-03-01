type User = {
  name: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
  city: string;
  interest: string;
  notifications: string[];
  genres: string[];
  bio: string;
};

type EventItem = {
  id: string;
  name: string;
  city: string;
  genre: string;
  date: string;
  venue: string;
  owner: string;
};

type SeedEvent = {
  name: string;
  city: string;
  genre: string;
  date: string;
  venue: string;
};

type SeedEventTemplate = {
  name: string;
  city: string;
  genre: string;
  venue: string;
  daysFromNow: number;
};

const loginView = document.getElementById("login-view") as HTMLElement | null;
const signupView = document.getElementById("signup-view") as HTMLElement | null;
const dashboardView = document.getElementById("dashboard-view") as HTMLElement | null;
const createEventView = document.getElementById("create-event-view") as HTMLElement | null;

const loginForm = document.getElementById("login-form") as HTMLFormElement | null;
const signupForm = document.getElementById("signup-form") as HTMLFormElement | null;
const logoutButton = document.getElementById("logout-button") as HTMLButtonElement | null;
const goToSignupButton = document.getElementById("go-to-signup") as HTMLButtonElement | null;
const goToLoginButton = document.getElementById("go-to-login") as HTMLButtonElement | null;
const goToCreateEventButton = document.getElementById("go-to-create-event") as HTMLButtonElement | null;
const backToDashboardButton = document.getElementById("back-to-dashboard") as HTMLButtonElement | null;

const eventForm = document.getElementById("event-form") as HTMLFormElement | null;
const eventNameInput = document.getElementById("event-name") as HTMLInputElement | null;
const eventCityInput = document.getElementById("event-city") as HTMLSelectElement | null;
const eventGenreInput = document.getElementById("event-genre") as HTMLSelectElement | null;
const eventDateInput = document.getElementById("event-date") as HTMLInputElement | null;
const eventVenueInput = document.getElementById("event-venue") as HTMLInputElement | null;
const eventList = document.getElementById("event-list") as HTMLUListElement | null;
const searchForm = document.getElementById("search-form") as HTMLFormElement | null;
const searchCityInput = document.getElementById("search-city") as HTMLSelectElement | null;
const searchGenreInput = document.getElementById("search-genre") as HTMLSelectElement | null;
const searchResults = document.getElementById("search-results") as HTMLUListElement | null;

const users: User[] = [];
const events: EventItem[] = [];
const STORAGE_KEYS = {
  users: "bliss_users",
  events: "bliss_events",
  currentUser: "bliss_current_user",
  searchFilters: "bliss_search_filters"
} as const;
const seedEventTemplates: SeedEventTemplate[] = [
  {
    name: "Neon Pulse Festival",
    city: "goa",
    genre: "edm",
    venue: "Sunset Beach Arena",
    daysFromNow: 21
  },
  {
    name: "Warehouse Frequency",
    city: "mumbai",
    genre: "techno",
    venue: "Dockyard Warehouse",
    daysFromNow: 12
  },
  {
    name: "Skyline House Sessions",
    city: "bangalore",
    genre: "house",
    venue: "Skyline Terrace",
    daysFromNow: 36
  },
  {
    name: "Old School Block Party",
    city: "delhi",
    genre: "hiphop",
    venue: "Central Grounds",
    daysFromNow: 18
  }
];
let currentUser: Pick<User, "name" | "email"> | null = null;
type AppView = "login" | "signup" | "dashboard" | "create-event";
type SearchFilters = {
  city: string;
  genre: string;
};
type ToastType = "success" | "error" | "info";

function loadUsersFromStorage(): User[] {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<User>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((user) => ({
        name: String(user.name ?? "").trim(),
        email: String(user.email ?? "")
          .trim()
          .toLowerCase(),
        password: String(user.password ?? ""),
        phone: String(user.phone ?? "").trim(),
        dob: String(user.dob ?? ""),
        city: String(user.city ?? ""),
        interest: String(user.interest ?? ""),
        notifications: Array.isArray(user.notifications)
          ? user.notifications.map((value) => String(value))
          : [],
        genres: Array.isArray(user.genres)
          ? user.genres.map((value) => String(value))
          : [],
        bio: String(user.bio ?? "").trim()
      }))
      .filter((user) => Boolean(user.name && user.email && user.password));
  } catch {
    return [];
  }
}

function loadEventsFromStorage(): EventItem[] {
  const raw = localStorage.getItem(STORAGE_KEYS.events);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<EventItem>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((eventItem, index) => ({
      id:
        typeof eventItem.id === "string" && eventItem.id
          ? eventItem.id
          : `legacy-${index}-${eventItem.name ?? "event"}`,
      name: String(eventItem.name ?? ""),
      city: String(eventItem.city ?? ""),
      genre: String(eventItem.genre ?? ""),
      date: String(eventItem.date ?? ""),
      venue: String(eventItem.venue ?? ""),
      owner: String(eventItem.owner ?? "")
    }));
  } catch {
    return [];
  }
}

function loadCurrentUserFromStorage(): Pick<User, "name" | "email"> | null {
  const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Pick<User, "name" | "email">;
    if (parsed?.email && parsed?.name) return parsed;
    return null;
  } catch {
    return null;
  }
}

function loadSearchFiltersFromStorage(): SearchFilters {
  const raw = localStorage.getItem(STORAGE_KEYS.searchFilters);
  if (!raw) return { city: "", genre: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<SearchFilters>;
    return {
      city: typeof parsed.city === "string" ? parsed.city : "",
      genre: typeof parsed.genre === "string" ? parsed.genre : ""
    };
  } catch {
    return { city: "", genre: "" };
  }
}

function persistUsers(): void {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function persistEvents(): void {
  localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
}

function persistCurrentUser(): void {
  if (!currentUser) {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(currentUser));
}

function persistSearchFilters(filters: SearchFilters): void {
  localStorage.setItem(STORAGE_KEYS.searchFilters, JSON.stringify(filters));
}

function showToast(message: string, type: ToastType = "info"): void {
  const existingToast = document.getElementById("app-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.id = "app-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;

  const palette: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a8a" }
  };
  const style = palette[type];

  Object.assign(toast.style, {
    position: "fixed",
    left: "50%",
    top: "20px",
    transform: "translateX(-50%)",
    zIndex: "9999",
    maxWidth: "360px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${style.border}`,
    background: style.bg,
    color: style.text,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)",
    fontFamily: "inherit",
    fontSize: "0.95rem"
  } as CSSStyleDeclaration);

  document.body.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function dateFromNow(daysFromNow: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function isPastDate(dateString: string): boolean {
  const selectedDate = new Date(dateString);
  selectedDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selectedDate < today;
}

function sortEventsByDate<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCurrentUserEvents(): EventItem[] {
  if (!currentUser) return [];
  return events.filter((eventItem) => eventItem.owner === currentUser?.email);
}

const seededEvents: SeedEvent[] = seedEventTemplates.map((eventTemplate) => ({
  ...eventTemplate,
  date: dateFromNow(eventTemplate.daysFromNow)
}));

function setHash(view: AppView): void {
  const targetHash = `#/${view}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
}

function showLogin(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = false;
  signupView.hidden = true;
  dashboardView.hidden = true;
  createEventView.hidden = true;
  if (updateHash) setHash("login");
}

function showSignup(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = true;
  signupView.hidden = false;
  dashboardView.hidden = true;
  createEventView.hidden = true;
  if (updateHash) setHash("signup");
}

function showDashboard(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = true;
  signupView.hidden = true;
  dashboardView.hidden = false;
  createEventView.hidden = true;
  if (updateHash) setHash("dashboard");
}

function showCreateEvent(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = true;
  signupView.hidden = true;
  dashboardView.hidden = true;
  createEventView.hidden = false;
  if (updateHash) setHash("create-event");
}

function renderEvents(): void {
  if (!eventList) return;
  eventList.innerHTML = "";

  sortEventsByDate(getCurrentUserEvents()).forEach((eventItem, index) => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = `${index + 1}. ${eventItem.name} | ${eventItem.city.toUpperCase()} | ${eventItem.genre.toUpperCase()} | ${eventItem.date} | ${eventItem.venue}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      const targetIndex = events.findIndex((item) => item.id === eventItem.id);
      if (targetIndex < 0) return;

      events.splice(targetIndex, 1);
      persistEvents();
      renderEvents();
      refreshSearchResultsFromCurrentFilters();
    });

    li.appendChild(text);
    li.appendChild(deleteButton);
    eventList.appendChild(li);
  });
}

function renderSearchResults(results: SeedEvent[]): void {
  if (!searchResults) return;
  searchResults.innerHTML = "";

  if (results.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No events found for this city and genre.";
    searchResults.appendChild(emptyItem);
    return;
  }

  sortEventsByDate(results).forEach((eventItem, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${eventItem.name} | ${eventItem.city.toUpperCase()} | ${eventItem.genre.toUpperCase()} | ${eventItem.date} | ${eventItem.venue}`;
    searchResults.appendChild(li);
  });
}

function getSearchableEvents(): SeedEvent[] {
  return [...seededEvents, ...events];
}

function refreshSearchResultsFromCurrentFilters(): void {
  if (!searchCityInput || !searchGenreInput) return;
  const city = searchCityInput.value;
  const genre = searchGenreInput.value;

  if (!city || !genre) {
    renderSearchResults(getSearchableEvents());
    return;
  }

  const filteredEvents = getSearchableEvents().filter(
    (eventItem) => eventItem.city === city && eventItem.genre === genre
  );
  renderSearchResults(filteredEvents);
}

function hydrateSearchFilters(): void {
  if (!searchCityInput || !searchGenreInput) return;
  const filters = loadSearchFiltersFromStorage();
  searchCityInput.value = filters.city;
  searchGenreInput.value = filters.genre;
}

function handleRouteChange(): void {
  const route = window.location.hash.replace(/^#\//, "");

  if (route === "signup") {
    if (currentUser) {
      showDashboard();
      renderEvents();
      refreshSearchResultsFromCurrentFilters();
      return;
    }
    showSignup(false);
    return;
  }

  if (route === "dashboard") {
    if (!currentUser) {
      showLogin();
      return;
    }
    showDashboard(false);
    renderEvents();
    refreshSearchResultsFromCurrentFilters();
    return;
  }

  if (route === "create-event") {
    if (!currentUser) {
      showLogin();
      return;
    }
    showCreateEvent(false);
    return;
  }

  if (route === "login" && currentUser) {
    showDashboard();
    renderEvents();
    refreshSearchResultsFromCurrentFilters();
    return;
  }

  showLogin(false);
}

goToSignupButton?.addEventListener("click", () => {
  showSignup();
});

goToLoginButton?.addEventListener("click", () => {
  showLogin();
});

goToCreateEventButton?.addEventListener("click", () => {
  showCreateEvent();
});

backToDashboardButton?.addEventListener("click", () => {
  showDashboard();
  renderEvents();
  refreshSearchResultsFromCurrentFilters();
});

signupForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(signupForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const dob = String(formData.get("dob") || "");
  const city = String(formData.get("city") || "");
  const interest = String(formData.get("interest") || "");
  const notifications = formData
    .getAll("notifications")
    .map((value) => String(value));
  const genres = formData.getAll("genres").map((value) => String(value));
  const bio = String(formData.get("bio") || "").trim();
  const password = String(formData.get("password") || "");
  const acceptedTerms = formData.get("terms") === "on";

  if (!name || !email || !phone || !dob || !city || !interest || !password) {
    alert("Please complete all required signup fields.");
    return;
  }
  if (password.length < 8) {
    alert("Password must be at least 8 characters long.");
    return;
  }
  if (!acceptedTerms) {
    alert("Please accept Terms and Privacy Policy to continue.");
    return;
  }

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    alert("An account with this email already exists.");
    return;
  }

  users.push({
    name,
    email,
    password,
    phone,
    dob,
    city,
    interest,
    notifications,
    genres,
    bio
  });
  persistUsers();
  signupForm.reset();
  showToast("Account created. You can now sign in to Bliss.", "success");
  showLogin();
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    alert("Please enter both email and password to sign in.");
    return;
  }

  const matchedUser = users.find(
    (user) => user.email === email && user.password === password
  );
  if (!matchedUser) {
    alert("Invalid email or password.");
    return;
  }

  currentUser = { name: matchedUser.name, email: matchedUser.email };
  persistCurrentUser();
  loginForm.reset();
  showToast(`Welcome back, ${matchedUser.name}. You are now signed in.`, "success");
  showDashboard();
  renderEvents();
  renderSearchResults(getSearchableEvents());
});

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!searchCityInput || !searchGenreInput) return;
  const city = searchCityInput.value;
  const genre = searchGenreInput.value;

  if (!city || !genre) {
    alert("Please select both city and genre before searching.");
    return;
  }
  persistSearchFilters({ city, genre });

  const filteredEvents = getSearchableEvents().filter(
    (eventItem) => eventItem.city === city && eventItem.genre === genre
  );

  renderSearchResults(filteredEvents);
});

eventForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("Please sign in first.");
    showLogin();
    return;
  }

  if (
    !eventNameInput ||
    !eventCityInput ||
    !eventGenreInput ||
    !eventDateInput ||
    !eventVenueInput
  )
    return;
  const name = eventNameInput.value.trim();
  const city = eventCityInput.value;
  const genre = eventGenreInput.value;
  const date = eventDateInput.value;
  const venue = eventVenueInput.value.trim();
  const ownerEmail = currentUser.email;

  if (!name || !city || !genre || !date || !venue) {
    alert("Please complete all event details before publishing.");
    return;
  }
  if (isPastDate(date)) {
    alert("Event date must be today or a future date.");
    return;
  }

  const isDuplicateEvent = events.some(
    (eventItem) =>
      eventItem.owner === ownerEmail &&
      eventItem.name.toLowerCase() === name.toLowerCase() &&
      eventItem.city === city &&
      eventItem.date === date &&
      eventItem.venue.toLowerCase() === venue.toLowerCase()
  );
  if (isDuplicateEvent) {
    alert("You already published this event.");
    return;
  }

  events.push({
    id: createEventId(),
    name,
    city,
    genre,
    date,
    venue,
    owner: ownerEmail
  });
  persistEvents();

  eventNameInput.value = "";
  eventCityInput.value = "";
  eventGenreInput.value = "";
  eventDateInput.value = "";
  eventVenueInput.value = "";

  showToast(`Event published: ${name}.`, "success");
  showDashboard();
  renderEvents();
  refreshSearchResultsFromCurrentFilters();
});

logoutButton?.addEventListener("click", () => {
  currentUser = null;
  persistCurrentUser();
  showLogin();
});

users.push(...loadUsersFromStorage());
events.push(...loadEventsFromStorage());
currentUser = loadCurrentUserFromStorage();
hydrateSearchFilters();

if (currentUser) {
  showDashboard(false);
  renderEvents();
  renderSearchResults(getSearchableEvents());
} else {
  showLogin(false);
}

window.addEventListener("hashchange", handleRouteChange);
handleRouteChange();
