type User = {
  name: string;
  email: string;
  password: string;
};

type EventItem = {
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

const loginForm = document.getElementById("login-form") as HTMLFormElement | null;
const signupForm = document.getElementById("signup-form") as HTMLFormElement | null;
const logoutButton = document.getElementById("logout-button") as HTMLButtonElement | null;
const goToSignupButton = document.getElementById("go-to-signup") as HTMLButtonElement | null;
const goToLoginButton = document.getElementById("go-to-login") as HTMLButtonElement | null;

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
  currentUser: "bliss_current_user"
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
type AppView = "login" | "signup" | "dashboard";

function loadUsersFromStorage(): User[] {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as User[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadEventsFromStorage(): EventItem[] {
  const raw = localStorage.getItem(STORAGE_KEYS.events);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as EventItem[];
    return Array.isArray(parsed) ? parsed : [];
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
  if (!loginView || !signupView || !dashboardView) return;
  loginView.hidden = false;
  signupView.hidden = true;
  dashboardView.hidden = true;
  if (updateHash) setHash("login");
}

function showSignup(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView) return;
  loginView.hidden = true;
  signupView.hidden = false;
  dashboardView.hidden = true;
  if (updateHash) setHash("signup");
}

function showDashboard(updateHash = true): void {
  if (!loginView || !signupView || !dashboardView) return;
  loginView.hidden = true;
  signupView.hidden = true;
  dashboardView.hidden = false;
  if (updateHash) setHash("dashboard");
}

function renderEvents(): void {
  if (!eventList) return;
  eventList.innerHTML = "";

  sortEventsByDate(events).forEach((eventItem, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${eventItem.name} | ${eventItem.city.toUpperCase()} | ${eventItem.genre.toUpperCase()} | ${eventItem.date} | ${eventItem.venue}`;
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

function handleRouteChange(): void {
  const route = window.location.hash.replace(/^#\//, "");

  if (route === "signup") {
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

  showLogin(false);
}

goToSignupButton?.addEventListener("click", () => {
  showSignup();
});

goToLoginButton?.addEventListener("click", () => {
  showLogin();
});

signupForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(signupForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const acceptedTerms = formData.get("terms") === "on";

  if (!name || !email || !password) {
    alert("Please enter name, email, and password to create your account.");
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

  users.push({ name, email, password });
  persistUsers();
  signupForm.reset();
  alert("Account created successfully. Please sign in.");
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

  if (!name || !city || !genre || !date || !venue) {
    alert("Please complete all event details before publishing.");
    return;
  }
  if (isPastDate(date)) {
    alert("Event date must be today or a future date.");
    return;
  }

  events.push({ name, city, genre, date, venue, owner: currentUser.email });
  persistEvents();

  eventNameInput.value = "";
  eventCityInput.value = "";
  eventGenreInput.value = "";
  eventDateInput.value = "";
  eventVenueInput.value = "";

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

if (currentUser) {
  showDashboard(false);
  renderEvents();
  renderSearchResults(getSearchableEvents());
} else {
  showLogin(false);
}

window.addEventListener("hashchange", handleRouteChange);
handleRouteChange();
