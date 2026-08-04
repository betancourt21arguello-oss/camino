# Plan: Replace Gemini dailySpiritualPearl/messages with `daily_quotes` Supabase Table

## Context

- Evangelizo.org feeds return **English** biblical text.
- The app target audience is **Venezuela / Hispanic Latin America**.
- Currently `generateLiturgy` asks Gemini to invent `dailySpiritualPearl` and `messages` — this produces unreliable, hallucinated quotes.
- Solution: remove `dailySpiritualPearl` and `messages` from the Gemini prompt entirely. Fetch them from a new `daily_quotes` table in Supabase, keyed by `fecha` (YYYYMMDD).
- If no row exists for today, fallback deterministically to a hardcoded quote pool (no AI, no external API).

## Supabase Schema: `daily_quotes`

```sql
create table daily_quotes (
  fecha text not null check (fecha ~ '^\d{8}$'),
  cita text not null,
  speaker text not null default '',
  contexto text not null default '',
  created_at timestamptz default now(),
  primary key (fecha)
);

create index idx_daily_quotes_created_at on daily_quotes(created_at);
```

## Changes Required

### 1. Remove `dailySpiritualPearl` and `messages` from Gemini prompt

In `generateLiturgy` (line ~1138):
- Remove the entire `dailySpiritualPearl` section from the prompt schema (`liturgyStructure`).
- Remove all rules about pearl sources, quote authenticity, speaker lists, etc.
- Remove the `messages` field from the schema.
- Remove the nuclear retry prompt pearl-related rules (none currently, but ensure none are added).

### 2. Add `daily_quotes` fetch helper

Add near line 525 (with other Supabase helpers):

```typescript
const FALLBACK_DAILY_QUOTES: Array<{ source: string; text: string }> = [
  { source: "San José Gregorio Hernández", text: "Dios se sirve de los humildes para hacer grandes obras." },
  { source: "San José Gregorio Hernández", text: "La caridad es el amor de Dios derramado en nuestros corazones." },
  { source: "Salmo 23", text: "El Señor es mi pastor, nada me falta." },
  { source: "San Juan Pablo II", text: "No tengan miedo. ¡Abran de par en par las puertas a Cristo!" },
  { source: "Papa Francisco", text: "La Iglesia es un hospital de campo después de la batalla." },
  // ... add 20-30 more real, approved quotes
];

function getDeterministicDailyMessage(date: string): { source: string; text: string } {
  if (!date) return FALLBACK_DAILY_QUOTES[0];
  const dayOfYear = Math.floor(
    (new Date(date.slice(0, 4), +date.slice(4, 6) - 1, date.slice(6, 8)).getTime() -
      new Date(date.slice(0, 4), 0, 0).getTime()) /
    86400000
  );
  return FALLBACK_DAILY_QUOTES[dayOfYear % FALLBACK_DAILY_QUOTES.length];
}

async function fetchDailyQuote(env: any, dateKey: string): Promise<{ cita: string; speaker: string; contexto: string; source: string } | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/daily_quotes?fecha=eq.${encodeURIComponent(dateKey)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const row = data?.[0] || null;
  if (!row) return null;
  return {
    cita: row.cita || "",
    speaker: row.speaker || "",
    contexto: row.contexto || "",
    source: "supabase",
  };
}
```

### 3. Update `generateLiturgy` to inject quote after Gemini generation

After the AI generates the liturgy JSON and post-processing is done (around line ~1520, just before `return parsed`):

```typescript
const dateKey = target.replace(/-/g, "");
let dailyQuote: { cita: string; speaker: string; contexto: string; source: string } | null = null;
try {
  dailyQuote = await fetchDailyQuote(env, dateKey);
} catch (e) {
  console.warn("[Quote] fetchDailyQuote failed:", e);
}

if (dailyQuote) {
  parsed.dailySpiritualPearl = {
    source: dailyQuote.speaker || "Cita del día",
    type: "quote",
    speaker: dailyQuote.speaker,
    context: dailyQuote.contexto,
    date: target,
    text: dailyQuote.cita,
    reason: "",
    theme: "",
  };
  parsed.messages = [
    {
      source: dailyQuote.speaker || "Cita del día",
      text: dailyQuote.cita,
      relevant: true,
    },
  ];
} else {
  const fallback = getDeterministicDailyMessage(target);
  parsed.dailySpiritualPearl = {
    source: fallback.source,
    type: "quote",
    speaker: fallback.source,
    context: "",
    date: target,
    text: fallback.text,
    reason: "",
    theme: "",
  };
  parsed.messages = [
    {
      source: fallback.source,
      text: fallback.text,
      relevant: true,
    },
  ];
}
```

### 4. Update `getDefaultLiturgy` to use deterministic fallback

Replace the static `dailySpiritualPearl` and `messages` in `getDefaultLiturgy` (line ~1619) with:

```typescript
const fallbackQuote = getDeterministicDailyMessage(date);
// ...
dailySpiritualPearl: { source: fallbackQuote.source, type: "quote", speaker: fallbackQuote.source, context: "", date, text: fallbackQuote.text, reason: "", theme: "" },
// ...
messages: [{ source: fallbackQuote.source, text: fallbackQuote.text, relevant: true }],
```

### 5. Remove all `dailySpiritualPearl` cleanup logic

Remove these blocks from `generateLiturgy` (they are no longer needed because the quote never comes from Gemini):
- The `if (!parsed.dailySpiritualPearl || !parsed.dailySpiritualPearl.text)` fallback block (~line 1486)
- The `San Jose Gregorio Hernandez` name normalization for `dailySpiritualPearl` (~line 1502)
- The `if (!parsed.marian || !parsed.marian.text)` block (~line 1498) — keep only if `marian` is still needed elsewhere
- The `messages` empty array fallback block (~line 1379) — remove or keep for safety

### 6. Quote pool curation

Populate `FALLBACK_DAILY_QUOTES` with ~30 real, public-domain Catholic quotes. Requirements:
- ~60% San José Gregorio Hernández
- ~30% Bible (Salmos, Evangelio)
- ~10% other approved Latin American Catholic sources (San Juan Pablo II, Papa Francisco, Virgen de Coromoto, etc.)
- Max 1-3 sentences each
- Never first-person Jesus speech
- No generic AI clichés
- All must be real, verifiable quotes

## Failure Modes

| Scenario | Behavior |
|---|---|
| `daily_quotes` row exists for today | Use it |
| `daily_quotes` row missing for today | Use deterministic fallback from pool |
| Supabase fetch fails | Catch error, use deterministic fallback |
| Gemini fails entirely, `getDefaultLiturgy` called | Uses deterministic fallback |

## Validation

- Confirm `dailySpiritualPearl` and `messages` are no longer in the Gemini prompt
- Confirm `fetchDailyQuote` queries `daily_quotes` by `fecha=eq.YYYYMMDD`
- Confirm fallback pool is used when Supabase returns no row
- Confirm `getDefaultLiturgy` uses deterministic fallback
- Confirm `npx tsc --noEmit` passes
- Confirm no existing exports/imports broken

## Out of Scope

- Creating the `daily_quotes` table itself (requires manual Supabase migration or dashboard)
- Translating existing `liturgy_cache` rows
- Changing the `marian` field behavior
