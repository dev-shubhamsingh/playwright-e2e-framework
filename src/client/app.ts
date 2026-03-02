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
const dobCalendar = document.getElementById("dob-calendar") as HTMLElement | null;
const dobPrevMonthButton = document.getElementById("dob-prev-month") as HTMLButtonElement | null;
const dobNextMonthButton = document.getElementById("dob-next-month") as HTMLButtonElement | null;
const dobMonthLabel = document.getElementById("dob-month-label") as HTMLElement | null;
const dobDaysGrid = document.getElementById("dob-days-grid") as HTMLElement | null;
const eventCalendar = document.getElementById("event-calendar") as HTMLElement | null;
const eventPrevMonthButton = document.getElementById("event-prev-month") as HTMLButtonElement | null;
const eventNextMonthButton = document.getElementById("event-next-month") as HTMLButtonElement | null;
const eventMonthLabel = document.getElementById("event-month-label") as HTMLElement | null;
const eventDaysGrid = document.getElementById("event-days-grid") as HTMLElement | null;

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
const signupDobInput = document.getElementById("signup-dob") as HTMLInputElement | null;

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
let dobCurrentMonth = 0;
let dobCurrentYear = 0;
let eventCurrentMonth = 0;
let eventCurrentYear = 0;

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

function formatDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDobMinDate(): Date {
  return new Date(1900, 0, 1);
}

function getDobMaxDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
}

function getEventMinDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getEventMaxDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
}

function parseIsoDate(dateString: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function isDateWithinRange(date: Date, min: Date, max: Date): boolean {
  return date >= min && date <= max;
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
  closeAllCalendars();
  if (updateHash) setHash("login");
}

function showSignup(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = true;
  signupView.hidden = false;
  dashboardView.hidden = true;
  createEventView.hidden = true;
  closeAllCalendars();
  if (updateHash) setHash("signup");
}

function showDashboard(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = true;
  signupView.hidden = true;
  dashboardView.hidden = false;
  createEventView.hidden = true;
  closeAllCalendars();
  if (updateHash) setHash("dashboard");
}

function showCreateEvent(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView || !createEventView) return;
  loginView.hidden = true;
  signupView.hidden = true;
  dashboardView.hidden = true;
  createEventView.hidden = false;
  closeAllCalendars();
  if (updateHash) setHash("create-event");
}

function renderDobCalendar(): void {
  if (!dobDaysGrid || !dobMonthLabel || !signupDobInput) return;

  dobDaysGrid.innerHTML = "";
  const monthStart = new Date(dobCurrentYear, dobCurrentMonth, 1);
  const startWeekday = monthStart.getDay();
  const daysInMonth = new Date(dobCurrentYear, dobCurrentMonth + 1, 0).getDate();
  const selectedDate = signupDobInput.value ? parseIsoDate(signupDobInput.value) : null;
  const minDate = getDobMinDate();
  const maxDate = getDobMaxDate();

  dobMonthLabel.textContent = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < startWeekday; i += 1) {
    const empty = document.createElement("span");
    empty.className = "calendar-empty";
    dobDaysGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(dobCurrentYear, dobCurrentMonth, day);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);

    const isAllowed = isDateWithinRange(date, minDate, maxDate);
    button.disabled = !isAllowed;
    if (
      selectedDate &&
      selectedDate.getFullYear() === date.getFullYear() &&
      selectedDate.getMonth() === date.getMonth() &&
      selectedDate.getDate() === date.getDate()
    ) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      signupDobInput.value = formatDateIso(date);
      closeDobCalendar();
    });

    dobDaysGrid.appendChild(button);
  }
}

function openDobCalendar(): void {
  if (!dobCalendar || !signupDobInput) return;
  closeEventCalendar();

  const selected = signupDobInput.value ? parseIsoDate(signupDobInput.value) : null;
  const maxDob = getDobMaxDate();
  const base = selected ?? maxDob;
  dobCurrentMonth = base.getMonth();
  dobCurrentYear = base.getFullYear();
  renderDobCalendar();
  dobCalendar.hidden = false;
}

function closeDobCalendar(): void {
  if (!dobCalendar) return;
  dobCalendar.hidden = true;
}

function renderEventCalendar(): void {
  if (!eventDaysGrid || !eventMonthLabel || !eventDateInput) return;

  eventDaysGrid.innerHTML = "";
  const monthStart = new Date(eventCurrentYear, eventCurrentMonth, 1);
  const startWeekday = monthStart.getDay();
  const daysInMonth = new Date(eventCurrentYear, eventCurrentMonth + 1, 0).getDate();
  const selectedDate = eventDateInput.value ? parseIsoDate(eventDateInput.value) : null;
  const minDate = getEventMinDate();
  const maxDate = getEventMaxDate();

  eventMonthLabel.textContent = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < startWeekday; i += 1) {
    const empty = document.createElement("span");
    empty.className = "calendar-empty";
    eventDaysGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(eventCurrentYear, eventCurrentMonth, day);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = String(day);

    const isAllowed = isDateWithinRange(date, minDate, maxDate);
    button.disabled = !isAllowed;
    if (
      selectedDate &&
      selectedDate.getFullYear() === date.getFullYear() &&
      selectedDate.getMonth() === date.getMonth() &&
      selectedDate.getDate() === date.getDate()
    ) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      eventDateInput.value = formatDateIso(date);
      closeEventCalendar();
    });

    eventDaysGrid.appendChild(button);
  }
}

function openEventCalendar(): void {
  if (!eventCalendar || !eventDateInput) return;
  closeDobCalendar();

  const selected = eventDateInput.value ? parseIsoDate(eventDateInput.value) : null;
  const minEventDate = getEventMinDate();
  const base = selected ?? minEventDate;
  eventCurrentMonth = base.getMonth();
  eventCurrentYear = base.getFullYear();
  renderEventCalendar();
  eventCalendar.hidden = false;
}

function closeEventCalendar(): void {
  if (!eventCalendar) return;
  eventCalendar.hidden = true;
}

function closeAllCalendars(): void {
  closeDobCalendar();
  closeEventCalendar();
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

signupDobInput?.addEventListener("click", () => {
  openDobCalendar();
});

signupDobInput?.addEventListener("focus", () => {
  openDobCalendar();
});

eventDateInput?.addEventListener("click", () => {
  openEventCalendar();
});

eventDateInput?.addEventListener("focus", () => {
  openEventCalendar();
});

dobPrevMonthButton?.addEventListener("click", () => {
  dobCurrentMonth -= 1;
  if (dobCurrentMonth < 0) {
    dobCurrentMonth = 11;
    dobCurrentYear -= 1;
  }
  renderDobCalendar();
});

dobNextMonthButton?.addEventListener("click", () => {
  dobCurrentMonth += 1;
  if (dobCurrentMonth > 11) {
    dobCurrentMonth = 0;
    dobCurrentYear += 1;
  }
  renderDobCalendar();
});

eventPrevMonthButton?.addEventListener("click", () => {
  eventCurrentMonth -= 1;
  if (eventCurrentMonth < 0) {
    eventCurrentMonth = 11;
    eventCurrentYear -= 1;
  }
  renderEventCalendar();
});

eventNextMonthButton?.addEventListener("click", () => {
  eventCurrentMonth += 1;
  if (eventCurrentMonth > 11) {
    eventCurrentMonth = 0;
    eventCurrentYear += 1;
  }
  renderEventCalendar();
});

document.addEventListener("click", (event) => {
  const target = event.target as Node;
  const activeDobCalendar = dobCalendar;
  const activeEventCalendar = eventCalendar;

  if (activeDobCalendar && !activeDobCalendar.hidden) {
    if (
      activeDobCalendar.contains(target) ||
      signupDobInput?.contains(target)
    ) {
      return;
    }
    closeDobCalendar();
  }

  if (activeEventCalendar && !activeEventCalendar.hidden) {
    if (
      activeEventCalendar.contains(target) ||
      eventDateInput?.contains(target)
    ) {
      return;
    }
    closeEventCalendar();
  }
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
  const parsedDob = parseIsoDate(dob);
  if (!parsedDob || !isDateWithinRange(parsedDob, getDobMinDate(), getDobMaxDate())) {
    alert("Please select a valid date of birth (age 13+).");
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
