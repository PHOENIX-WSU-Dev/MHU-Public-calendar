const scheduleContainer = document.getElementById('schedule-container');

async function loadSchedule() {
  try {
    const response = await fetch('schedule.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load schedule.json (status ${response.status})`);
    }

    const events = await response.json();
    if (!Array.isArray(events) || events.length === 0) {
      renderEmptyState();
      return;
    }

    const sortedEvents = events
      .slice()
      .sort((a, b) => {
        const dateDiff = new Date(a.Date) - new Date(b.Date);
        if (dateDiff !== 0) {
          return dateDiff;
        }
        const timeA = parseTime(a.StartTime);
        const timeB = parseTime(b.StartTime);
        return timeA - timeB;
      });

    renderSchedule(sortedEvents);
  } catch (error) {
    renderErrorState(error.message);
  }
}

function parseTime(timeString) {
  if (!timeString) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(`1970-01-01T${convertTo24Hour(timeString)}`);
  return date.getTime();
}

function convertTo24Hour(timeString) {
  const [timePart, modifier] = timeString.trim().split(/\s+/);
  if (!timePart || !modifier) {
    return `${timePart || '00:00'}:00`;
  }

  let [hours, minutes] = timePart.split(':').map(Number);
  if (modifier.toLowerCase() === 'pm' && hours < 12) {
    hours += 12;
  }
  if (modifier.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00`;
}

function renderSchedule(events) {
  const grouped = events.reduce((acc, event) => {
    const dateKey = event.Date || 'Undated';
    if (!acc.has(dateKey)) {
      acc.set(dateKey, []);
    }
    acc.get(dateKey).push(event);
    return acc;
  }, new Map());

  const fragment = document.createDocumentFragment();

  grouped.forEach((eventList, date) => {
    const section = document.createElement('article');
    section.className = 'date-section';

    const heading = document.createElement('h2');
    heading.className = 'date-heading';
    heading.textContent = formatDateLabel(date);
    section.appendChild(heading);

    eventList.forEach((event) => {
      section.appendChild(renderEvent(event));
    });

    fragment.appendChild(section);
  });

  scheduleContainer.innerHTML = '';
  scheduleContainer.appendChild(fragment);
}

function renderEvent(event) {
  const item = document.createElement('div');
  item.className = 'event-item';

  const time = document.createElement('div');
  time.className = 'event-time';
  const timeRange = [event.StartTime, event.EndTime].filter(Boolean).join(' - ');
  time.textContent = timeRange || 'Time TBD';
  item.appendChild(time);

  const details = document.createElement('div');
  details.className = 'event-details';

  if (event.IsPrivate) {
    const privateLabel = document.createElement('div');
    privateLabel.className = 'private-event';
    privateLabel.textContent = '(Private Event)';
    details.appendChild(privateLabel);
  } else {
    const name = document.createElement('p');
    name.className = 'event-name';
    name.textContent = event.EventName || 'Untitled Event';
    details.appendChild(name);

    const location = document.createElement('p');
    location.className = 'event-location';
    location.textContent = event.Location || 'Location TBA';
    details.appendChild(location);
  }

  item.appendChild(details);
  return item;
}

function renderEmptyState() {
  scheduleContainer.innerHTML = `
    <div class="date-section">
      <h2 class="date-heading">No Upcoming Events</h2>
      <p class="event-location">Check back soon for the latest schedule updates.</p>
    </div>
  `;
}

function renderErrorState(message) {
  scheduleContainer.innerHTML = `
    <div class="date-section">
      <h2 class="date-heading">Schedule Unavailable</h2>
      <p class="event-location">${message}</p>
    </div>
  `;
}

function formatDateLabel(dateString) {
  if (!dateString || dateString === 'Undated') {
    return 'Undated Events';
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

loadSchedule();
