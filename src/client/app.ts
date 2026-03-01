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

function dateFromNow(daysFromNow: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const seededEvents: SeedEvent[] = seedEventTemplates.map((eventTemplate) => ({
  ...eventTemplate,
  date: dateFromNow(eventTemplate.daysFromNow)
}));

function showLogin(): void {
  if (!loginView || !signupView || !dashboardView) return;
  loginView.hidden = false;
  signupView.hidden = true;
  dashboardView.hidden = true;
}

function showSignup(): void {
  if (!loginView || !signupView || !dashboardView) return;
  loginView.hidden = true;
  signupView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard(): void {
  if (!loginView || !signupView || !dashboardView) return;
  loginView.hidden = true;
  signupView.hidden = true;
  dashboardView.hidden = false;
}

function renderEvents(): void {
  if (!eventList) return;
  eventList.innerHTML = "";

  events.forEach((eventItem, index) => {
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

  results.forEach((eventItem, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${eventItem.name} | ${eventItem.city.toUpperCase()} | ${eventItem.genre.toUpperCase()} | ${eventItem.date} | ${eventItem.venue}`;
    searchResults.appendChild(li);
  });
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

  if (!name || !email || !password) return;

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    alert("An account with this email already exists.");
    return;
  }

  users.push({ name, email, password });
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

  const matchedUser = users.find(
    (user) => user.email === email && user.password === password
  );
  if (!matchedUser) {
    alert("Invalid email or password.");
    return;
  }

  currentUser = { name: matchedUser.name, email: matchedUser.email };
  loginForm.reset();
  showDashboard();
  renderSearchResults([...seededEvents, ...events]);
});

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!searchCityInput || !searchGenreInput) return;
  const city = searchCityInput.value;
  const genre = searchGenreInput.value;

  if (!city || !genre) return;

  const searchableEvents: SeedEvent[] = [...seededEvents, ...events];
  const filteredEvents = searchableEvents.filter(
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

  if (!name || !city || !genre || !date || !venue) return;

  events.push({ name, city, genre, date, venue, owner: currentUser.email });

  eventNameInput.value = "";
  eventCityInput.value = "";
  eventGenreInput.value = "";
  eventDateInput.value = "";
  eventVenueInput.value = "";

  renderEvents();
});

logoutButton?.addEventListener("click", () => {
  currentUser = null;
  showLogin();
});

showLogin();
