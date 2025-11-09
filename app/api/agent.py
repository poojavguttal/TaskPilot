# agent.py
import os
import json
import re
import google.generativeai as genai

# 1) Configure Gemini by env var: export GEMINI_API_KEY=...
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Debug: List available models (uncomment to see options)
print("=" * 50)
print("Available Gemini models:")
print("=" * 50)
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"  ✓ {m.name}")
except Exception as e:
    print(f"  Error listing models: {e}")
print("=" * 50)


# 2) System prompt: push ALL logic to the model
SYSTEM = """
You are TaskPilot, an expert productivity coach and planner.
Your job is to:
1) Parse a messy, newline-separated task list from the user.
2) Categorize each task into the Eisenhower Matrix:
   - urgent_important
   - important_not_urgent
   - urgent_not_important
   - not_urgent_not_important
3) Produce a time-blocked schedule starting from the user's provided timestamp,
   using the user's time zone. Infer reasonable durations from the task text and common sense.
4) Return a short, motivational "note" (<=120 chars).

### Scheduling rules (apply via reasoning):
- Use the user's timestamp and timezone to pick start times. Do not schedule in the past.
- If it is late evening (e.g., after 20:00 local), start big tasks next morning ~09:00 local.
- Prioritize "urgent_important" first; fit shorter admin items between bigger blocks.
- Keep blocks realistic (e.g., 20–30 min for emails/calls, 60–120 min for assignments/slides).
- If tasks imply deadlines like "tomorrow/Friday/eod", respect them and priortize.
- You may split a single large task into multiple blocks across the day(s).
- Avoid overlapping blocks.

### Output format (STRICT JSON, no extra text):
{
  "urgent_important": ["..."],
  "important_not_urgent": ["..."],
  "urgent_not_important": ["..."],
  "not_urgent_not_important": ["..."],
  "note": "string (<=120 chars)",
  "schedule_plan": [
    {
      "task": "string",
      "start_iso": "ISO-8601 with timezone offset, e.g. 2025-11-08T14:30:00-05:00",
      "end_iso":   "ISO-8601 with timezone offset, e.g. 2025-11-08T15:30:00-05:00"
    }
  ]
}

### Validation:
- Return ONLY valid JSON (no markdown, no code fences, no commentary).
- All timestamps MUST be ISO-8601 WITH timezone offset (e.g., "-05:00").
- Do not invent fields; use exactly the keys specified.
"""

def _extract_json(text: str) -> str:
    """
    Keep this tiny helper: it doesn't add logic;
    it only extracts the JSON block if the model wraps it in extra text by accident.
    """
    m = re.search(r"\{[\s\S]*\}\s*$", text)
    return m.group(0) if m else text

def run_agent(tasks_text: str, created_iso: str, timezone: str) -> dict:
    """
    Call the model with structured output configuration.
    Uses response_mime_type to force JSON output.
    """
    # Configure model with JSON response format
    model = genai.GenerativeModel(
        "models/gemini-2.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.7,
        }
    )

    user_prompt = f"""
User tasks (newline-separated):
{tasks_text}

User timestamp (ISO-8601 with timezone): {created_iso}
User timezone (IANA): {timezone}

Return the JSON per the required schema with these exact fields:
- urgent_important: array of strings
- important_not_urgent: array of strings  
- urgent_not_important: array of strings
- not_urgent_not_important: array of strings
- note: string (max 120 chars)
- schedule_plan: array of objects with task, start_iso, end_iso
"""

    try:
        resp = model.generate_content([SYSTEM.strip(), user_prompt.strip()])
        text = (resp.text or "").strip()
        
        # Debug output
        print("=" * 50)
        print("Model response (first 500 chars):")
        print(text[:500])
        print("=" * 50)
        
        # Parse JSON directly (no extraction needed with response_mime_type)
        payload = json.loads(text)
        return payload
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Full response: {text}")
        # Return a fallback response
        return {
            "urgent_important": [],
            "important_not_urgent": [],
            "urgent_not_important": [],
            "not_urgent_not_important": [tasks_text] if isinstance(tasks_text, str) else tasks_text,
            "note": "Unable to categorize tasks. Please try again.",
            "schedule_plan": []
        }
    except Exception as e:
        print(f"Error in run_agent: {e}")
        raise