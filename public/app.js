const homeView = document.getElementById("home-view");
const dashboardView = document.getElementById("dashboard-view");

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const logoutButton = document.getElementById("logout-button");

const eventForm = document.getElementById("event-form");
const eventNameInput = document.getElementById("event-name");
const eventDateInput = document.getElementById("event-date");
const eventVenueInput = document.getElementById("event-venue");
const eventList = document.getElementById("event-list");

const users = [];
const events = [];
let currentUser = null;

function showHome() {
  homeView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  homeView.hidden = true;
  dashboardView.hidden = false;
}

function renderEvents() {
  eventList.innerHTML = "";

  events.forEach((eventItem, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${eventItem.name} | ${eventItem.date} | ${eventItem.venue}`;
    eventList.appendChild(li);
  });
}

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(signupForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) return;

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    alert("An account with this email already exists.");
    return;
  }

  users.push({ name, email, password });
  currentUser = { name, email };
  signupForm.reset();
  showDashboard();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const matchedUser = users.find((user) => user.email === email && user.password === password);
  if (!matchedUser) {
    alert("Invalid email or password.");
    return;
  }

  currentUser = { name: matchedUser.name, email: matchedUser.email };
  loginForm.reset();
  showDashboard();
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("Please sign in first.");
    showHome();
    return;
  }

  const name = eventNameInput.value.trim();
  const date = eventDateInput.value;
  const venue = eventVenueInput.value.trim();

  if (!name || !date || !venue) return;

  events.push({ name, date, venue, owner: currentUser.email });

  eventNameInput.value = "";
  eventDateInput.value = "";
  eventVenueInput.value = "";

  renderEvents();
});

logoutButton.addEventListener("click", () => {
  currentUser = null;
  showHome();
});

showHome();
