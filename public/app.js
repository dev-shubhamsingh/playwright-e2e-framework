const eventForm = document.getElementById("event-form");
const eventNameInput = document.getElementById("event-name");
const eventDateInput = document.getElementById("event-date");
const eventVenueInput = document.getElementById("event-venue");
const eventList = document.getElementById("event-list");

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const genreInput = document.getElementById("genre-input");

const events = [];

function renderEvents() {
  eventList.innerHTML = "";

  events.forEach((eventItem, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${eventItem.name} | ${eventItem.date} | ${eventItem.venue}`;
    eventList.appendChild(li);
  });
}

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = eventNameInput.value.trim();
  const date = eventDateInput.value;
  const venue = eventVenueInput.value.trim();

  if (!name || !date || !venue) return;

  events.push({ name, date, venue });

  eventNameInput.value = "";
  eventDateInput.value = "";
  eventVenueInput.value = "";

  renderEvents();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  const genre = genreInput.value.trim();

  if (!city || !genre) return;

  alert(`Searching events in ${city} for ${genre}...`);
});
