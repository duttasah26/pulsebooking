import sql from '../../lib/db';
import { HttpError, actor, route } from '../../lib/api';
import { TOOLS, todayIST } from '../../lib/assistantTools';

// A chat answer can take a few model calls (one per tool it uses), so allow it more than the default time on Vercel.
export const config = { maxDuration: 30 };

// POST /api/assistant  { messages: [{ role: 'user' | 'assistant', text }] }  ->  { reply }
// Talks to Google's Gemini API with the read-only tools in lib/assistantTools.js (function calling). Configure with
//   GEMINI_API_KEY   required (a free key from Google AI Studio)
//   GEMINI_MODEL     optional, default gemini-flash-lite-latest (Google's cheapest text model family, Flash-Lite; the
//                    "latest" name always points at the newest one, so it keeps working when versions are retired)
//   GEMINI_API_BASE  optional, default https://generativelanguage.googleapis.com (used by tests)
// The key stays on the server. The assistant can read everything the app stores (bookings with who made them and when, the change log,
// guests, rooms, settings). It can WRITE one thing, book_stay (a new booking or hold), and only after the person has said yes in the chat:
// the model must ask first, and the server also checks that the latest message really is a yes. It cannot edit or delete anything.
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
- You can make a booking or a hold with book_stay, and nothing else: you cannot edit, move, confirm, cancel or delete. If asked for one of those, say so and tell them to do it in the calendar. To book you need the rooms (or how many, then find them with find_room_block or check_availability), the check-in and check-out days, and for a confirmed booking the guest name. Ask for anything missing in one short question; never invent a name, a date or a room. Then call book_stay WITHOUT confirmed, tell the person the summary in plain words (rooms, dates, nights, guest, status) and ask "Shall I book it?". Only when they answer yes, call book_stay again with the same details and confirmed true. If they change something, start again with a new summary. After booking, say in one sentence what was booked. A hold keeps the room without a confirmed guest; use it only when they ask for a hold.
- Every booking records WHEN it was made (booked_on, India time) and BY WHOM (booked_by), and when it was last changed. Use list_bookings with made_from and made_to for "what was booked today or this week", with newest_first for "the latest bookings", and booking_history for who edited, deleted or restored something and when. Say times in plain words ("today at 4:12 PM", "yesterday morning").
- You can look at everything the app stores: bookings (live, cancelled or deleted, with include), the change log (booking_history), the guest book (list_guests), the rooms and who is in them (list_rooms), and the settings (property_settings). If a question needs data, use the tool instead of saying you cannot see it.
- find_contact looks up a guest or organization (initials like ZB work) and gives their phone, email, stays and next upcoming stay. Use it for any question about a person or organization. Give phone numbers and emails only when asked for them. If several contacts match, say which ones.
- Answer briefly in plain sentences (a short list is fine). No tables, no markdown headings. Give numbers with their unit (room-nights, guests, percent).`;
}

// A short message that says yes ("yes", "yes please", "ok go ahead", "haan", "confirm") and does not also say no, wait or change.
const YES = /\b(yes|yeah|yep|yup|ok|okay|sure|confirm|confirmed|go ahead|do it|book it|please do|proceed|correct|right|haan|ji)\b/i;
const NOT_YET = /\b(no|not|don'?t|do not|wait|stop|cancel|change|instead|but|actually)\b/i;
const isYes = (text) => text.trim().length <= 80 && YES.test(text) && !NOT_YET.test(text);

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

  // The person's latest message must be a plain yes before book_stay may write anything. The model is told to ask first; this is the
  // server-side check that does not depend on the model behaving.
  const lastUser = incoming.filter((m) => m?.role === 'user' && typeof m.text === 'string').at(-1)?.text ?? '';
  const userConfirms = contents.length >= 3 && isYes(lastUser);
  const ctx = { by: `${actor(req) ?? 'staff'} (assistant)`, userConfirms, booked: [] };

  const system = await instructions();
  for (let step = 0; step < MAX_STEPS; step++) {
    const parts = await ask(contents, system);
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) {
      const reply = parts.map((p) => p.text ?? '').join('').trim();
      return res.status(200).json({ reply: reply || 'I could not find an answer to that.', booked: ctx.booked.length });
    }
    contents.push({ role: 'model', parts });
    const answers = [];
    for (const { functionCall } of calls) {
      const tool = TOOLS.find((t) => t.name === functionCall.name);
      let result;
      try {
        result = tool ? await tool.run(functionCall.args ?? {}, ctx) : { error: `There is no tool called ${functionCall.name}` };
      } catch (err) {
        result = { error: err.message }; // a bad date or range: the model can read this and try again
      }
      answers.push({ functionResponse: { name: functionCall.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: answers });
  }
  res.status(200).json({ reply: 'That needed too many steps. Try asking in a simpler way, for example one month at a time.', booked: ctx.booked.length });
}

export default route({ POST: chat });
