# api/ics.py
from uuid import uuid4
from datetime import datetime

def _fmt(dt_iso: str) -> str:
    return datetime.fromisoformat(dt_iso).strftime("%Y%m%dT%H%M")

def make_ics(plan: list, note: str, tzid: str="America/New_York") -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TaskPilot//EN"
    ]
    for item in plan:
        lines += [
            "BEGIN:VEVENT",
            f"UID:{uuid4()}",
            f"SUMMARY:TaskPilot: {item['task']}",
            f"DTSTART;TZID={tzid}:{_fmt(item['start_iso'])}",
            f"DTEND;TZID={tzid}:{_fmt(item['end_iso'])}",
            f"DESCRIPTION:{note}",
            "END:VEVENT"
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
