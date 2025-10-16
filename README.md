# Mobile Health Unit Schedule

This project transforms a local Excel workbook into a JSON feed and a responsive web experience featuring both list and calendar views. Public events link to a dedicated detail page with Google Maps directions, while private engagements keep their details hidden.

## Prerequisites

- [Python 3.9+](https://www.python.org/downloads/)
- [pip](https://pip.pypa.io/en/stable/installation/)
- [pandas](https://pandas.pydata.org/) (`pip install pandas`)
- An `EventSchedule.xlsx` file in this directory

## 1. Update the data

1. Open `EventSchedule.xlsx` and update the first worksheet.
2. Fill out the columns exactly as follows:
   - **Date** (`YYYY-MM-DD`)
   - **StartTime** (`10:00 AM`)
   - **EndTime** (`3:00 PM`)
   - **EventName** (public title; leave blank for private events)
   - **Location** (street address or virtual link description)
   - **IsPrivate** (`TRUE` for private engagements; blank/`FALSE` for public events)

Blank `IsPrivate` values are treated as public (`false`).

## 2. Generate `schedule.json`

From this repository folder, run:

```bash
python convert.py
```

The script reads `EventSchedule.xlsx`, sorts the rows chronologically, and writes a refreshed `schedule.json`. Each event receives a stable `EventId` for deep-linking.

## 3. View the schedule

Open `index.html` in your browser (double-click it or drag it into a window). The interface includes:

- **List view** – grouped by day with private events anonymized.
- **Month view** – calendar grid similar to the Wayne Health Mobile Health Unit calendar.
- **Event details** – public events link to `event.html`, which shows the full time, location, and a Google Maps button.

Use the “List / Month” toggle at the top of the page to switch layouts. Month navigation arrows let you browse upcoming months without reloading.

> **Tip:** Re-run `python convert.py` any time the Excel workbook changes to keep the website in sync.

## Troubleshooting

- **`FileNotFoundError`:** Ensure `EventSchedule.xlsx` sits next to `convert.py`.
- **No events appear:** Confirm the Excel file has at least one non-empty row and that you regenerated `schedule.json` after editing.
- **Private events showing details:** Verify the `IsPrivate` column is set to `TRUE` (capitalization optional).

## Testing

You can quickly validate the Python script syntax with:

```bash
python -m compileall convert.py
```

Front-end changes can be previewed by opening `index.html` or `event.html` in any modern browser. No build tools are required.
