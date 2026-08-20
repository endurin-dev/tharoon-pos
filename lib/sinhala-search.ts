// ─────────────────────────────────────────────────────────────────────────────
// sinhala-search.ts
//
// Lets the user type an employee's name in plain English letters (e.g. "akila")
// and match it against employee names stored in Sinhala (e.g. "අකිල").
//
// Approach: convert the Sinhala name to its Roman phonetic equivalent
// character-by-character (consonant + vowel-sign combinations, independent
// vowels, hal kirima/virama, anusvara, etc.), then do a case-insensitive
// substring match against whatever the user typed.
//
//   අකිල  →  a + ki + la  →  "akila"
//   සුනිල් → su + ni + l   →  "sunil"
//
// This is a phonetic approximation, not a strict transliteration standard —
// good enough for fuzzy search, not meant for round-tripping back to Sinhala.
// ─────────────────────────────────────────────────────────────────────────────

// ── Independent vowels (used when a vowel appears on its own, not attached
//    to a consonant) ─────────────────────────────────────────────────────────
const SINHALA_VOWELS: Record<string, string> = {
  '\u0D85': 'a',   // අ
  '\u0D86': 'aa',  // ආ
  '\u0D87': 'ae',  // ඇ
  '\u0D88': 'aae', // ඈ
  '\u0D89': 'i',   // ඉ
  '\u0D8A': 'ii',  // ඊ
  '\u0D8B': 'u',   // උ
  '\u0D8C': 'uu',  // ඌ
  '\u0D8D': 'ri',  // ඍ
  '\u0D8E': 'rii', // ඎ
  '\u0D8F': 'lu',  // ඏ
  '\u0D90': 'luu', // ඐ
  '\u0D91': 'e',   // එ
  '\u0D92': 'ee',  // ඒ
  '\u0D93': 'ai',  // ඓ
  '\u0D94': 'o',   // ඔ
  '\u0D95': 'oo',  // ඕ
  '\u0D96': 'au',  // ඖ
};

// ── Consonants, each with its inherent "a" sound already applied ───────────
const SINHALA_CONSONANTS: Record<string, string> = {
  '\u0D9A': 'ka', '\u0D9B': 'kha', '\u0D9C': 'ga', '\u0D9D': 'gha',
  '\u0D9E': 'nga', '\u0D9F': 'nga',
  '\u0DA0': 'cha', '\u0DA1': 'chha', '\u0DA2': 'ja', '\u0DA3': 'jha',
  '\u0DA4': 'nya', '\u0DA5': 'gna', '\u0DA6': 'jja',
  '\u0DA7': 'ta', '\u0DA8': 'tha', '\u0DA9': 'da', '\u0DAA': 'dha',
  '\u0DAB': 'na', '\u0DAC': 'nda',
  '\u0DAD': 'tha', '\u0DAE': 'tha', '\u0DAF': 'da', '\u0DB0': 'dha',
  '\u0DB1': 'na', '\u0DB3': 'nda',
  '\u0DB4': 'pa', '\u0DB5': 'pha', '\u0DB6': 'ba', '\u0DB7': 'bha',
  '\u0DB8': 'ma', '\u0DB9': 'mba',
  '\u0DBA': 'ya', '\u0DBB': 'ra', '\u0DBD': 'la',
  '\u0DC0': 'va', '\u0DC1': 'sha', '\u0DC2': 'sha', '\u0DC3': 'sa',
  '\u0DC4': 'ha', '\u0DC5': 'la', '\u0DC6': 'fa',
};

// ── Dependent vowel signs (attach to a preceding consonant, replacing its
//    inherent "a") ───────────────────────────────────────────────────────────
const VOWEL_SIGNS: Record<string, string> = {
  '\u0DCF': 'aa', '\u0DD0': 'ae', '\u0DD1': 'aae',
  '\u0DD2': 'i', '\u0DD3': 'ii', '\u0DD4': 'u', '\u0DD6': 'uu',
  '\u0DD8': 'ru', '\u0DD9': 'e', '\u0DDA': 'ee', '\u0DDB': 'ai',
  '\u0DDC': 'o', '\u0DDD': 'oo', '\u0DDE': 'au', '\u0DDF': 'lu',
};

const HAL_KIRIMA = '\u0DCA'; // ් — suppresses the consonant's inherent "a"
const ANUSVARA   = '\u0D82'; // ං
const VISARGA    = '\u0D83'; // ඃ
const ZWJ        = '\u200D'; // zero-width joiner (used in conjuncts)

/**
 * Converts a Sinhala string to a lowercase Roman phonetic approximation.
 * Non-Sinhala characters (spaces, English letters, punctuation) pass through
 * unchanged (lowercased), so mixed-script names still work.
 */
export function sinhalaToRoman(text: string): string {
  let result = '';
  const chars = Array.from(text);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (ch === ZWJ) continue;

    if (SINHALA_CONSONANTS[ch]) {
      const withA = SINHALA_CONSONANTS[ch];       // e.g. 'ka'
      const bare = withA.slice(0, -1);             // 'k'

      if (next === HAL_KIRIMA) {
        result += bare;      // consonant with no vowel (e.g. සුනිල් ending in ල්)
        i++;                 // consume the hal kirima
      } else if (next && VOWEL_SIGNS[next]) {
        result += bare + VOWEL_SIGNS[next];
        i++;                 // consume the vowel sign
      } else {
        result += withA;     // inherent 'a'
      }
      continue;
    }

    if (SINHALA_VOWELS[ch]) {
      result += SINHALA_VOWELS[ch];
      continue;
    }

    if (ch === ANUSVARA) { result += 'n'; continue; }
    if (ch === VISARGA)  { result += 'h'; continue; }

    result += ch.toLowerCase();
  }

  return result;
}

/**
 * True if `query` (typically typed in English) matches `name` (typically
 * Sinhala, but may already be English). Matches against:
 *   1. the raw name itself (covers English-named employees, or exact Sinhala paste)
 *   2. the phonetic Roman transliteration of the name
 * Both compared as case-insensitive substrings, and also checked per-word so
 * "kumara" matches "Nimal Kumara" / "නිමල් කුමාර".
 */
export function matchesEmployeeSearch(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const rawLower = name.toLowerCase();
  if (rawLower.includes(q)) return true;

  const romanized = sinhalaToRoman(name).toLowerCase();
  if (romanized.includes(q)) return true;

  // Per-word check so a search term matches any word in a multi-word name,
  // not just as a substring of the whole concatenated string.
  const words = romanized.split(/\s+/);
  return words.some(w => w.startsWith(q));
}