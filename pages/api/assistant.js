import sql from '../../lib/db';
import { HttpError, route } from '../../lib/api';
import { TOOLS, todayIST } from '../../lib/assistantTools';

// A chat answer can take a few model calls (one per tool it uses), so allow it more than the default time on Vercel.
export const config = { maxDuration: 30 };

// POST /api/assistant  { messages: [{ role: 'user' | 'assistant', text }] }  ->  { reply }
// Talks to Google's Gemini API with the read-only tools in lib/assistantTools.js (function calling). Configure with
//   GEMINI_API_KEY   required (a free key from Google AI Studio)
//   GEMINI_MODEL     optional, default gemini-flash-lite-latest (Google's cheapest text model family, Flash-Lite; the
//                    "latest" name always points at the newest one, so it keeps working when versions are retired)
//   GEMINI_API_BASE  optional, default https://generativelanguage.googleapis.com (used by tests)
// The key stays on the server. The assistant can only READ: it cannot book, change or delete anything.
const BASE = () => process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com';
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const MAX_STEPS = 6;

async function instructions() {
  const rooms = (await sql`SELECT number FROM rooms WHERE active ORDER BY number`).map((r) => r.number);
  const t = todayIST();
  const weekday = new Date(`${t}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' });
  return `You are the assistant inside the room booking app of The Pulse Newtown, a small property. Staff ask you about rooms and bookings.
Today is ${t} (${weekday}), India time. Rooms: ${rooms.join(', ')}. The first digit of a room number is its floor (1xx first floor, 2xx second, 3xx third). Usual check-in 2:00 PM, check-out 11:00 AM.

Rules:
- Get every number, room and date from the tools. Never guess or invent a booking, a room or a total.
- Dates: check_out is the day the guest leaves, so nights = check_out minus check_in. "12 to 15 Oct" means check-in the 12th, check-out the 15th, 3 nights. A month with no year means the next one that fits; if unsure, use the current year.
- Holds are tentative bookings. They block the room: say so when they matter, and count them apart from confirmed bookings.
- You can only READ. If asked to book, hold, confirm, edit or delete something, say you cannot do that yet and tell them which rooms and dates look free so they can do it in the calendar.
- find_contact looks up a guest or organization (initials like ZB work) and gives their phone, email, stays and next upcoming stay. Use it for any question about a person or organization. Give phone numbers and emails only when asked for them. If several contacts match, say which ones.
- Answer briefly in plain sentences (a short list is fine). No tables, no markdown headings. Give numbers with their unit (room-nights, guests, percent).`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One call to the model. The free plan allows only a few calls a minute, and the model is sometimes busy: on a 429 or 503
// it waits (as long as Google says, at most 20 seconds) and tries once more; if that fails too, the person is told in plain
// words what to do.
async function ask(contents, system, retried = false) {
  const response = await fetch(`${BASE()}/v1beta/models/${MODEL()}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      tools: [{ functionDeclarations: TOOLS.map(({ name, description, parameters }) => ({ name, description, parameters })) }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (response.ok) return (await response.json()).candidates?.[0]?.content?.parts ?? [];

  const detail = (await response.json().catch(() => null))?.error?.message ?? '';
  if (response.status === 429 || response.status === 503) {
    const seconds = Math.ceil(Number(/retry in ([\d.]+)s/i.exec(detail)?.[1]) || 8);
    if (!retried && seconds <= 20) {
      await sleep(seconds * 1000 + 500);
      return ask(contents, system, true);
    }
    throw new HttpError(
      429,
      response.status === 429
        ? `The free AI plan allows only a few questions a minute, and that limit was reached. Please wait about ${Math.max(seconds, 10)} seconds and ask again.`
        : 'The AI service is very busy right now. Please wait a moment and ask again.',
    );
  }
  throw new HttpError(502, `The AI service refused the request (${response.status})${detail ? `: ${detail}` : ''}`);
}

async function chat(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    throw new HttpError(503, 'The assistant is not set up yet. Add GEMINI_API_KEY to the environment variables, then restart the app.');
  }
  const incoming = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
  const contents = incoming
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text.slice(0, 2000) }] }));
  if (!contents.length || contents[contents.length - 1].role !== 'user') throw new HttpError(400, 'Send a message to ask about');

  const system = await instructions();
  for (let step = 0; step < MAX_STEPS; step++) {
    const parts = await ask(contents, system);
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      const reply = parts.map((p) => p.text ?? '').join('').trim();
      return res.status(200).json({ reply: reply || 'I could not find an answer to that.' });
    }
    contents.push({ role: 'model', parts });
    const answers = [];
    for (const { functionCall } of calls) {
      const tool = TOOLS.find((t) => t.name === functionCall.name);
      let result;
      try {
        result = tool ? await tool.run(functionCall.args ?? {}) : { error: `There is no tool called ${functionCall.name}` };
      } catch (err) {
        result = { error: err.message }; // a bad date or range: the model can read this and try again
      }
      answers.push({ functionResponse: { name: functionCall.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: answers });
  }
  res.status(200).json({ reply: 'That needed too many steps. Try asking in a simpler way, for example one month at a time.' });
}

export default route({ POST: chat });
