"""Utility to convert EventSchedule.xlsx into schedule.json."""
from __future__ import annotations

import json
from datetime import date, datetime, time
from pathlib import Path

from typing import Any

import pandas as pd


def _format_date(value: Any) -> str:
    """Format a pandas Excel date cell into ISO string (YYYY-MM-DD)."""
    if pd.isna(value):
        return ""
    if isinstance(value, pd.Timestamp):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.isoformat()
    # Fall back to string representation.
    return str(value)


def _format_time(value: Any) -> str:
    """Format a pandas Excel time cell into 12-hour string with AM/PM."""
    if pd.isna(value):
        return ""
    if isinstance(value, pd.Timestamp):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        value = value.time()
    if isinstance(value, time):
        return _time_to_string(value)
    if isinstance(value, (int, float)):
        # Excel stores times as fraction of a day.
        seconds = float(value) * 24 * 3600
        hours, remainder = divmod(seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        try:
            t_value = time(int(hours) % 24, int(minutes) % 60, int(seconds) % 60)
            return _time_to_string(t_value)
        except ValueError:
            return str(value)
    return str(value)


def _time_to_string(value: time) -> str:
    formatted = value.strftime("%I:%M %p")
    return formatted.lstrip("0")


def _to_bool(value: Any) -> bool:
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    normalized = str(value).strip().lower()
    return normalized in {"true", "yes", "1", "y"}


def _sort_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    sortable = df.copy()
    sortable["__date_sort"] = pd.to_datetime(sortable.get("Date"), errors="coerce")
    sortable["__start_sort"] = pd.to_datetime(
        sortable.get("StartTime").astype(str), errors="coerce"
    )
    sortable = sortable.sort_values(["__date_sort", "__start_sort"], kind="mergesort")
    return sortable.drop(columns=["__date_sort", "__start_sort"])


def convert_excel_to_json(
    input_path: Path = Path("EventSchedule.xlsx"),
    output_path: Path = Path("schedule.json"),
) -> None:
    if not input_path.exists():
        raise FileNotFoundError(
            f"Input Excel file not found: {input_path}. Please provide EventSchedule.xlsx."
        )

    df = pd.read_excel(input_path, sheet_name=0)
    output_path: Path = Path("F:/MHU-public-calendar/MHU-Public-calendar/schedule.json"),
) -> None:

    df = pd.read_excel("EventSchedule.xlsx", sheet_name="Sheet1")
    print(df.head())
    df = df.dropna(how="all")
    df = _sort_dataframe(df)

    records = []
    namespace = uuid.uuid5(uuid.NAMESPACE_URL, "https://mhu-public-calendar.local/event")

    for index, row in df.iterrows():
    for _, row in df.iterrows():
        record = {
            "Date": _format_date(row.get("Date")),
            "StartTime": _format_time(row.get("StartTime")),
            "EndTime": _format_time(row.get("EndTime")),
            "EventName": row.get("EventName", "") if not pd.isna(row.get("EventName")) else "",
            "Location": row.get("Location", "") if not pd.isna(row.get("Location")) else "",
            "IsPrivate": _to_bool(row.get("IsPrivate")),
        }
        record["EventId"] = _build_event_id(record, namespace, index)
        records.append(record)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        f.write("\n")

def _build_event_id(record: dict[str, Any], namespace: uuid.UUID, index: int) -> str:
    """Generate a stable event identifier for deep linking."""

    parts = [
        record.get("Date", ""),
        record.get("StartTime", ""),
        record.get("EndTime", ""),
        record.get("EventName", ""),
        record.get("Location", ""),
        "private" if record.get("IsPrivate") else "public",
    ]
    base = "|".join(str(part).strip().lower() for part in parts if part is not None)

    if not base.strip():
        base = f"row-{index}"

    return uuid.uuid5(namespace, base).hex


if __name__ == "__main__":
    convert_excel_to_json()
