const detailContainer = document.getElementById('event-detail');
const params = new URLSearchParams(window.location.search);
const requestedId = params.get('id');

if (!requestedId) {
  renderMissingId();
} else {
  loadEvent(requestedId);
}

async function loadEvent(id) {
  try {
    const response = await fetch('schedule.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load schedule.json (status ${response.status})`);
    }

    const events = await response.json();
    if (!Array.isArray(events) || events.length === 0) {
      renderNotFound();
      return;
    }

    const normalized = events
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
        return {
          ...sanitized,
          EventId: ensureEventId(sanitized, index),
        };
      });

    const match = normalized.find((event) => event.EventId === id);
    if (!match) {
      renderNotFound();
      return;
    }

    renderEvent(match);
  } catch (error) {
    renderError(error.message);
  }
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

  let hash = 0;
  for (let i = 0; i < baseString.length; i += 1) {
    hash = (hash << 5) - hash + baseString.charCodeAt(i);
    hash |= 0;
  }
  return `event-${(hash >>> 0).toString(16)}`;
}

function renderEvent(event) {
  detailContainer.innerHTML = '';

  const title = document.createElement('h2');
  title.className = 'detail-title';
  title.textContent = event.IsPrivate
    ? 'Private Event'
    : event.EventName || 'Untitled Event';
  detailContainer.appendChild(title);

  if (event.IsPrivate) {
    const message = document.createElement('p');
    message.className = 'detail-value';
    message.textContent =
      'This time slot is reserved for a private engagement. Specific details are hidden.';
    detailContainer.appendChild(message);

    const backLink = document.createElement('a');
    backLink.href = 'index.html';
    backLink.className = 'button-link secondary';
    backLink.textContent = 'Back to schedule';

    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    actions.appendChild(backLink);
    detailContainer.appendChild(actions);
    return;
  }

  const metadata = document.createElement('div');
  metadata.className = 'detail-metadata';
  metadata.appendChild(createMetadataRow('Date', formatDateLabel(event.Date)));
  metadata.appendChild(createMetadataRow('Time', formatTimeRange(event)));
  metadata.appendChild(createMetadataRow('Location', event.Location || 'Location TBA'));
  detailContainer.appendChild(metadata);

  const actions = document.createElement('div');
  actions.className = 'detail-actions';

  if (event.Location) {
    const mapLink = document.createElement('a');
    mapLink.href = buildMapUrl(event.Location);
    mapLink.target = '_blank';
    mapLink.rel = 'noopener noreferrer';
    mapLink.className = 'button-link';
    mapLink.textContent = 'Open in Google Maps';
    actions.appendChild(mapLink);
  }

  const backLink = document.createElement('a');
  backLink.href = 'index.html';
  backLink.className = 'button-link secondary';
  backLink.textContent = 'Back to schedule';
  actions.appendChild(backLink);

  detailContainer.appendChild(actions);
}

function createMetadataRow(label, value) {
  const wrapper = document.createElement('div');
  const labelEl = document.createElement('span');
  labelEl.className = 'detail-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('p');
  valueEl.className = 'detail-value';
  valueEl.textContent = value;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(valueEl);
  return wrapper;
}

function formatDateLabel(dateString) {
  if (!dateString) {
    return 'Date TBD';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeRange(event) {
  const parts = [event.StartTime, event.EndTime].filter(Boolean);
  if (!parts.length) {
    return 'Time TBD';
  }
  return parts.join(' – ');
}

function buildMapUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
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

function renderMissingId() {
  detailContainer.innerHTML = `
    <h2 class="detail-title">Event not specified</h2>
    <p class="detail-value">Select an event from the schedule to view its details.</p>
    <div class="detail-actions">
      <a class="button-link secondary" href="index.html">Back to schedule</a>
    </div>
  `;
}

function renderNotFound() {
  detailContainer.innerHTML = `
    <h2 class="detail-title">Event unavailable</h2>
    <p class="detail-value">We couldn't find the event you're looking for. It may have been removed or renamed.</p>
    <div class="detail-actions">
      <a class="button-link secondary" href="index.html">Back to schedule</a>
    </div>
  `;
}

function renderError(message) {
  detailContainer.innerHTML = `
    <h2 class="detail-title">Error loading event</h2>
    <p class="detail-value">${message}</p>
    <div class="detail-actions">
      <a class="button-link secondary" href="index.html">Back to schedule</a>
    </div>
  `;
}
