const scheduleContainer = document.getElementById('schedule-container');
const toolbar = document.getElementById('toolbar');
const viewButtons = document.querySelectorAll('[data-view]');
const monthControls = document.getElementById('month-controls');
const monthLabel = document.getElementById('month-label');

const state = {
  view: 'list',
  month: startOfMonth(new Date()),
};

let normalizedEvents = [];

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

    normalizedEvents = normalizeEvents(events);
    state.month = deriveInitialMonth(normalizedEvents);
    bindControls();
    updateToolbar();
    render();
  } catch (error) {
    renderErrorState(error.message);
  }
}

function bindControls() {
  if (toolbar.dataset.bound === 'true') {
    return;
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextView = button.dataset.view;
      if (!nextView || nextView === state.view) {
        return;
      }
      state.view = nextView;
      updateToolbar();
      render();
    });
  });

  monthControls.addEventListener('click', (event) => {
    const target = event.target.closest('[data-direction]');
    if (!target) {
      return;
    }

    const direction = target.dataset.direction;
    if (direction === 'prev') {
      state.month = addMonths(state.month, -1);
    } else if (direction === 'next') {
      state.month = addMonths(state.month, 1);
    }

    updateToolbar();
    render();
  });

  toolbar.dataset.bound = 'true';
}

function render() {
  if (!normalizedEvents.length) {
    renderEmptyState();
    return;
  }

  if (state.view === 'month') {
    renderCalendarView();
  } else {
    renderListView();
  }
}

function normalizeEvents(events) {
  return events
    .filter((event) => event && typeof event === 'object')
    .map((event, index) => {
      const sanitized = {
        ...event,
        Date: cleanText(event.Date),
        StartTime: cleanText(event.StartTime),
        EndTime: cleanText(event.EndTime),
        EventName: cleanText(event.EventName),
        Location: cleanText(event.Location),
        IsPrivate: toBoolean(event.IsPrivate),
      };
      const dateObj = parseISODate(sanitized.Date);
      return {
        ...sanitized,
        EventId: ensureEventId(sanitized, index),
        __date: dateObj,
        __time: parseTime(sanitized.StartTime),
        __rowIndex: index,
      };
    })
    .sort((a, b) => {
      const dateDiff = compareDates(a.__date, b.__date);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return a.__time - b.__time;
    });
}

function ensureEventId(event, index) {
  if (event.EventId) {
    return event.EventId;
  }

  const baseParts = [
    event.Date || '',
    event.StartTime || '',
    event.EndTime || '',
    event.EventName || '',
    event.Location || '',
    event.IsPrivate ? 'private' : 'public',
  ];
  const baseString = baseParts
    .map((part) => String(part).trim().toLowerCase())
    .join('|');

  if (!baseString.trim()) {
    return `event-${index}`;
  }

  return cryptoHash(baseString);
}

function cryptoHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `event-${(hash >>> 0).toString(16)}`;
}

function renderListView() {
  scheduleContainer.className = 'schedule-container list-view';

  const grouped = normalizedEvents.reduce((acc, event) => {
    const key = event.Date || 'Undated';
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push(event);
    return acc;
  }, new Map());

  const fragment = document.createDocumentFragment();

  grouped.forEach((eventsForDate, key) => {
    const section = document.createElement('article');
    section.className = 'date-section';

    const heading = document.createElement('h2');
    heading.className = 'date-heading';
    heading.textContent = formatDateLabel(key);
    section.appendChild(heading);

    eventsForDate.forEach((event) => {
      section.appendChild(renderListEvent(event));
    });

    fragment.appendChild(section);
  });

  scheduleContainer.innerHTML = '';
  scheduleContainer.appendChild(fragment);
}

function renderListEvent(event) {
  const item = document.createElement('div');
  item.className = 'event-item';

  const time = document.createElement('div');
  time.className = 'event-time';
  time.textContent = formatTimeRange(event);
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

    const link = document.createElement('a');
    link.href = `event.html?id=${encodeURIComponent(event.EventId)}`;
    link.className = 'event-link';
    link.textContent = event.EventName || 'Untitled Event';
    name.appendChild(link);
    details.appendChild(name);

    const location = document.createElement('p');
    location.className = 'event-location';
    location.textContent = event.Location || 'Location TBA';
    details.appendChild(location);
  }

  item.appendChild(details);
  return item;
}

function renderCalendarView() {
  scheduleContainer.className = 'schedule-container calendar-view';
  const start = state.month;
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

  const eventsByDate = normalizedEvents.reduce((acc, event) => {
    if (!event.__date) {
      return acc;
    }
    if (
      event.__date.getFullYear() !== start.getFullYear() ||
      event.__date.getMonth() !== start.getMonth()
    ) {
      return acc;
    }
    const key = event.__date.toISOString().split('T')[0];
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push(event);
    return acc;
  }, new Map());

  const fragment = document.createDocumentFragment();

  const headerRow = document.createElement('div');
  headerRow.className = 'calendar-header';
  getWeekdayNames().forEach((day) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-header-cell';
    cell.textContent = day;
    headerRow.appendChild(cell);
  });
  fragment.appendChild(headerRow);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const leadingEmpty = (start.getDay() + 7) % 7;
  for (let i = 0; i < leadingEmpty; i += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell is-empty';
    grid.appendChild(emptyCell);
  }

  const todayKey = new Date().toISOString().split('T')[0];

  for (let day = 1; day <= end.getDate(); day += 1) {
    const cellDate = new Date(start.getFullYear(), start.getMonth(), day);
    const isoKey = cellDate.toISOString().split('T')[0];
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    if (isoKey === todayKey) {
      cell.classList.add('is-today');
    }

    const label = document.createElement('div');
    label.className = 'calendar-date';
    label.textContent = day;
    cell.appendChild(label);

    const eventList = document.createElement('div');
    eventList.className = 'calendar-events';

    const dailyEvents = eventsByDate.get(isoKey) || [];
    dailyEvents.forEach((event) => {
      const entry = document.createElement(event.IsPrivate ? 'span' : 'a');
      entry.className = 'calendar-event';
      if (!event.IsPrivate) {
        entry.href = `event.html?id=${encodeURIComponent(event.EventId)}`;
      } else {
        entry.setAttribute('aria-label', 'Private event');
      }
      entry.textContent = calendarEventLabel(event);
      eventList.appendChild(entry);
    });

    cell.appendChild(eventList);
    grid.appendChild(cell);
  }

  const totalCells = leadingEmpty + end.getDate();
  const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < trailing; i += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell is-empty';
    grid.appendChild(emptyCell);
  }

  fragment.appendChild(grid);
  scheduleContainer.innerHTML = '';
  scheduleContainer.appendChild(fragment);
}

function formatTimeRange(event) {
  const pieces = [event.StartTime, event.EndTime].filter(Boolean);
  if (pieces.length === 0) {
    return 'Time TBD';
  }
  return pieces.join(' – ');
}

function calendarEventLabel(event) {
  if (event.IsPrivate) {
    return `${formatTimeRange(event)} (Private Event)`;
  }
  const name = event.EventName || 'Untitled Event';
  const timeRange = formatTimeRange(event);
  return timeRange === 'Time TBD' ? name : `${timeRange} · ${name}`;
}

function formatDateLabel(dateString) {
  if (!dateString || dateString === 'Undated') {
    return 'Undated Events';
  }

  const parsed = parseISODate(dateString);
  if (!parsed) {
    return dateString;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function parseTime(timeString) {
  if (!timeString) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(`1970-01-01T${convertTo24Hour(timeString)}`);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return date.getTime();
}

function convertTo24Hour(timeString) {
  if (!timeString) {
    return '00:00:00';
  }

  const [timePart, modifier] = timeString.trim().split(/\s+/);
  if (!timePart) {
    return '00:00:00';
  }

  let [hours, minutes = '0'] = timePart.split(':');
  let hrs = Number.parseInt(hours, 10);
  const mins = Number.parseInt(minutes, 10) || 0;

  if (Number.isNaN(hrs)) {
    return '00:00:00';
  }

  if (modifier) {
    const mod = modifier.toLowerCase();
    if (mod === 'pm' && hrs < 12) {
      hrs += 12;
    }
    if (mod === 'am' && hrs === 12) {
      hrs = 0;
    }
  }

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

function renderEmptyState() {
  scheduleContainer.className = 'schedule-container list-view';
  scheduleContainer.innerHTML = `
    <div class="date-section">
      <h2 class="date-heading">No Upcoming Events</h2>
      <p class="event-location">Check back soon for the latest schedule updates.</p>
    </div>
  `;
  toolbar.hidden = true;
}

function renderErrorState(message) {
  scheduleContainer.className = 'schedule-container list-view';
  scheduleContainer.innerHTML = `
    <div class="date-section">
      <h2 class="date-heading">Schedule Unavailable</h2>
      <p class="event-location">${message}</p>
    </div>
  `;
  toolbar.hidden = true;
}

function parseISODate(input) {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compareDates(a, b) {
  if (!a && !b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a.getTime() - b.getTime();
}

function cleanText(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value == null) {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value).trim();
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return Boolean(value);
}

function getWeekdayNames() {
  const base = new Date(2025, 0, 5); // Sunday
  return Array.from({ length: 7 }, (_, index) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + index).toLocaleDateString(
      undefined,
      { weekday: 'short' }
    )
  );
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function deriveInitialMonth(events) {
  const today = startOfMonth(new Date());
  const upcoming = events.find((event) => event.__date && event.__date >= new Date());
  const reference = upcoming?.__date || events.find((event) => event.__date)?.__date || today;
  return startOfMonth(reference || today);
}

function updateToolbar() {
  toolbar.hidden = false;

  viewButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === state.view);
  });

  if (state.view === 'month') {
    monthControls.removeAttribute('hidden');
    monthLabel.textContent = state.month.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  } else {
    monthControls.setAttribute('hidden', '');
  }
}

loadSchedule();
