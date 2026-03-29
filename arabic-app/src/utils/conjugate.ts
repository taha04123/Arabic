// ─────────────────────────────────────────────────────────────────
// src/utils/conjugate.ts
// Algorithmic Arabic verb conjugation.
// Generates past/present arrays (13 forms each) from type + madi.
// ─────────────────────────────────────────────────────────────────

export type VerbType =
  | 'strong' | 'ajwaf_waw' | 'ajwaf_ya'
  | 'naqis_waw' | 'naqis_ya'
  | 'mithal_waw' | 'mithal_ya' | 'mudaaf'
  | 'form2' | 'form3' | 'form4' | 'form4_ajwaf' | 'form5' | 'form6'
  | 'form7' | 'form8' | 'form10';

export interface VerbInput {
  type: VerbType;
  madi: string;                              // base مَاضِي form with full harakat
  mudariVowel?: 'a' | 'i' | 'u';            // required for strong / mithal types
  conjugation?: { past?: string[]; present?: string[] }; // manual override
}

// ── Unicode constants ─────────────────────────────────────────────
const FA = '\u064E'; // ◌َ  fatha
const KA = '\u0650'; // ◌ِ  kasra
const DA = '\u064F'; // ◌ُ  damma
const SK = '\u0652'; // ◌ْ  sukun
const SH = '\u0651'; // ◌ّ  shadda

const ALIF       = '\u0627'; // ا
const ALIF_MADD  = '\u0622'; // آ
const WAW        = '\u0648'; // و
const YA         = '\u064A'; // ي
const ALIF_MAQ   = '\u0649'; // ى  (alif maqsura)
const HAMZA_WAW  = '\u0624'; // ؤ  (hamzah on waw — used in Form IV present)

const HARAKA_RE = /[\u064B-\u065F\u0670]/g;

// Present prefix sets
const FA_PREFS = { y: 'يَ', t: 'تَ', a: 'أَ', n: 'نَ' }; // Form I
const DA_PREFS = { y: 'يُ', t: 'تُ', a: 'أُ', n: 'نُ' }; // Forms II/III/IV

// ── Core helpers ──────────────────────────────────────────────────

/** Split Arabic text into segments: each = one consonant + its harakat marks. */
function splitSegs(s: string): string[] {
  const result: string[] = [];
  let cur = '';
  for (const c of s) {
    const cp = c.codePointAt(0) ?? 0;
    if ((cp >= 0x064B && cp <= 0x065F) || cp === 0x0670) {
      cur += c; // haraka — attach to current consonant
    } else {
      if (cur) result.push(cur);
      cur = c;
    }
  }
  if (cur) result.push(cur);
  return result;
}

/** Remove all harakat, returning bare consonants only. */
function bare(s: string): string {
  return s.replace(HARAKA_RE, '');
}

/** Orthographic normalisation applied after each form is built:
 *  نْنَ  →  نَّ        (root-final ن before نَ / نَا suffixes)
 *  أَأْ  →  آ         (أنا prefix + root-initial أ: أَأْمُرُ → آمُرُ)
 *  أَا   →  آ         (hamzah+fatha+alif → alif madda in dual)
 *  Hamza seat rules for final-hamza verbs (قَرَأَ, جَاءَ):
 *  ِءْ   →  ِئْ       kasra + plain ء + sukun  → on ya seat
 *  ءِ    →  ئِ        plain ء + kasra           → on ya seat
 *  أِ    →  ئِ        ء on alif + kasra (medial) → on ya seat
 *  يءُ   →  يئُ       after long ya + ء + damma  → on ya seat
 *  يءَا  →  يآ        after long ya + ءَا         → alif madda (present dual)
 *  أُوا  →  ءُوا      word-final ء + هم past suffix
 *  أُونَ →  ءُونَ     word-final ء + هم present suffix  */
function norm(s: string): string {
  return s
    .replace(/\u0646\u0652\u0646\u064E/g, '\u0646\u0651\u064E')             // نْنَ → نَّ
    .replace(/\u0623\u064E\u0623\u0652/g, '\u0622')                          // أَأْ → آ
    .replace(/\u0623\u064E\u0627/g,       '\u0622')                          // أَا  → آ
    .replace(/\u0650\u0621\u0652/g, '\u0650\u0626\u0652')                    // ِءْ → ِئْ
    .replace(/\u0621\u0650/g,       '\u0626\u0650')                          // ءِ  → ئِ
    .replace(/\u0623\u0650/g,       '\u0626\u0650')                          // أِ  → ئِ
    .replace(/\u064A\u0621\u064F/g, '\u064A\u0626\u064F')                    // يءُ → يئُ
    .replace(/\u064A\u0621\u064E\u0627/g, '\u064A\u0622')                    // يءَا → يآ
    .replace(/\u0623\u064F\u0648\u0627/g, '\u0621\u064F\u0648\u0627')        // أُوا → ءُوا
    .replace(/\u0623\u064F\u0648\u064E\u0646\u064E/g, '\u0621\u064F\u0648\u064E\u0646\u064E'); // أُونَ → ءُونَ
}

/** Convert a mudariVowel letter to its Unicode haraka mark. */
function vmark(v: 'a' | 'i' | 'u'): string {
  return v === 'a' ? FA : v === 'i' ? KA : DA;
}

// ── Past suffix table ─────────────────────────────────────────────
// Shared by all verb types.  pre = stem without c3; c3 = bare last consonant.
function pastSuffixes(pre: string, c3: string): string[] {
  const st = pre + c3;
  return [
    norm(st + FA),            // 0  هو
    norm(st + FA + 'تْ'),     // 1  هي
    norm(st + FA + ALIF),     // 2  هما م
    norm(st + FA + 'تَا'),    // 3  هما ف
    norm(st + DA + 'وا'),     // 4  هم
    norm(st + SK + 'نَ'),     // 5  هن
    norm(st + SK + 'تَ'),     // 6  أنت
    norm(st + SK + 'تِ'),     // 7  أنتِ
    norm(st + SK + 'تُمَا'),  // 8  أنتما
    norm(st + SK + 'تُمْ'),   // 9  أنتم
    norm(st + SK + 'تُنَّ'),  // 10 أنتن
    norm(st + SK + 'تُ'),     // 11 أنا
    norm(st + SK + 'نَا'),    // 12 نحن
  ];
}

// ── Present suffix table ──────────────────────────────────────────
// stem(pref) must return everything up to (but not including) the final
// إعراب vowel.  prefs selects Form-I (fatha) or derived (damma) prefixes.
function presentSuffixes(
  stem: (pref: string) => string,
  prefs = FA_PREFS
): string[] {
  const { y, t, a, n } = prefs;
  return [
    norm(stem(y) + DA),           // 0  هو
    norm(stem(t) + DA),           // 1  هي
    norm(stem(y) + FA + 'انِ'),   // 2  هما م
    norm(stem(t) + FA + 'انِ'),   // 3  هما ف
    norm(stem(y) + DA + 'ونَ'),   // 4  هم
    norm(stem(y) + SK + 'نَ'),    // 5  هن
    norm(stem(t) + DA),           // 6  أنت
    norm(stem(t) + KA + 'ينَ'),   // 7  أنتِ
    norm(stem(t) + FA + 'انِ'),   // 8  أنتما
    norm(stem(t) + DA + 'ونَ'),   // 9  أنتم
    norm(stem(t) + SK + 'نَ'),    // 10 أنتن
    norm(stem(a) + DA),           // 11 أنا
    norm(stem(n) + DA),           // 12 نحن
  ];
}

// ── Type-specific conjugators ─────────────────────────────────────

function conjStrong(sg: string[], mudV: 'a' | 'i' | 'u') {
  const c1 = bare(sg[0]), c2 = bare(sg[1]), c3 = bare(sg[2]);
  return {
    past:    pastSuffixes(sg[0] + sg[1], c3),
    present: presentSuffixes(p => p + c1 + SK + c2 + vmark(mudV) + c3),
  };
}

function conjAjwafWaw(sg: string[]) {
  // sg = ["قَ","ا","لَ"]  — f, alif, l
  const f = bare(sg[0]), l = bare(sg[2]);
  const elong  = sg[0] + ALIF + l; // قَال
  const contr  = f + DA + l + SK;  // قُلْ
  const past = [
    norm(elong + FA),           // قَالَ
    norm(elong + FA + 'تْ'),    // قَالَتْ
    norm(elong + FA + ALIF),    // قَالَا
    norm(elong + FA + 'تَا'),   // قَالَتَا
    norm(elong + DA + 'وا'),    // قَالُوا
    norm(contr + 'نَ'),         // قُلْنَ
    norm(contr + 'تَ'),         // قُلْتَ
    norm(contr + 'تِ'),         // قُلْتِ
    norm(contr + 'تُمَا'),      // قُلْتُمَا
    norm(contr + 'تُمْ'),       // قُلْتُمْ
    norm(contr + 'تُنَّ'),      // قُلْتُنَّ
    norm(contr + 'تُ'),         // قُلْتُ
    norm(contr + 'نَا'),        // قُلْنَا
  ];
  const base = (p: string) => p + f + DA + WAW + l; // يَقُول
  const present = [
    norm(base('يَ') + DA),
    norm(base('تَ') + DA),
    norm(base('يَ') + FA + 'انِ'),
    norm(base('تَ') + FA + 'انِ'),
    norm(base('يَ') + DA + 'ونَ'),
    norm('يَ' + f + DA + l + SK + 'نَ'),   // waw drops for هن
    norm(base('تَ') + DA),
    norm(base('تَ') + KA + 'ينَ'),
    norm(base('تَ') + FA + 'انِ'),
    norm(base('تَ') + DA + 'ونَ'),
    norm('تَ' + f + DA + l + SK + 'نَ'),   // waw drops for أنتن
    norm(base('أَ') + DA),
    norm(base('نَ') + DA),
  ];
  return { past, present };
}

function conjAjwafYa(sg: string[]) {
  // sg = ["بَ","ا","عَ"]  — f, alif, l
  const f = bare(sg[0]), l = bare(sg[2]);
  const elong = sg[0] + ALIF + l; // بَاع
  const contr = f + KA + l + SK;  // بِعْ  (kasra, not damma)
  const past = [
    norm(elong + FA),
    norm(elong + FA + 'تْ'),
    norm(elong + FA + ALIF),
    norm(elong + FA + 'تَا'),
    norm(elong + DA + 'وا'),
    norm(contr + 'نَ'),
    norm(contr + 'تَ'),
    norm(contr + 'تِ'),
    norm(contr + 'تُمَا'),
    norm(contr + 'تُمْ'),
    norm(contr + 'تُنَّ'),
    norm(contr + 'تُ'),
    norm(contr + 'نَا'),
  ];
  const base = (p: string) => p + f + KA + YA + l; // يَبِيع
  const present = [
    norm(base('يَ') + DA),
    norm(base('تَ') + DA),
    norm(base('يَ') + FA + 'انِ'),
    norm(base('تَ') + FA + 'انِ'),
    norm(base('يَ') + DA + 'ونَ'),
    norm('يَ' + f + KA + l + SK + 'نَ'),   // ya drops for هن
    norm(base('تَ') + DA),
    norm(base('تَ') + KA + 'ينَ'),
    norm(base('تَ') + FA + 'انِ'),
    norm(base('تَ') + DA + 'ونَ'),
    norm('تَ' + f + KA + l + SK + 'نَ'),   // ya drops for أنتن
    norm(base('أَ') + DA),
    norm(base('نَ') + DA),
  ];
  return { past, present };
}

function conjNaqisYa(sg: string[]) {
  // sg = ["هَ","دَ","ى"]  — c1, c2, alif-maqsura
  const f = bare(sg[0]), a = bare(sg[1]);
  const stem2 = sg[0] + sg[1]; // هَدَ
  const past = [
    stem2 + ALIF_MAQ,               // هَدَى
    stem2 + 'تْ',                    // هَدَتْ
    stem2 + YA + FA + ALIF,          // هَدَيَا
    stem2 + 'تَا',                   // هَدَتَا
    stem2 + WAW + SK + ALIF,         // هَدَوْا
    stem2 + YA + SK + 'نَ',          // هَدَيْنَ
    stem2 + YA + SK + 'تَ',          // هَدَيْتَ
    stem2 + YA + SK + 'تِ',          // هَدَيْتِ
    stem2 + YA + SK + 'تُمَا',       // هَدَيْتُمَا
    stem2 + YA + SK + 'تُمْ',        // هَدَيْتُمْ
    stem2 + YA + SK + 'تُنَّ',       // هَدَيْتُنَّ
    stem2 + YA + SK + 'تُ',          // هَدَيْتُ
    stem2 + YA + SK + 'نَا',         // هَدَيْنَا
  ];
  const base  = (p: string) => p + f + SK + a + KA + YA; // يَهْدِي
  const dupl  = (p: string) => p + f + SK + a + DA + 'ونَ'; // يَهْدُونَ
  const present = [
    base('يَ'),                      // يَهْدِي
    base('تَ'),                      // تَهْدِي
    base('يَ') + FA + 'انِ',         // يَهْدِيَانِ
    base('تَ') + FA + 'انِ',         // تَهْدِيَانِ
    dupl('يَ'),                      // يَهْدُونَ
    base('يَ') + 'نَ',               // يَهْدِينَ
    base('تَ'),                      // تَهْدِي
    base('تَ') + 'نَ',               // تَهْدِينَ
    base('تَ') + FA + 'انِ',         // تَهْدِيَانِ
    dupl('تَ'),                      // تَهْدُونَ
    base('تَ') + 'نَ',               // تَهْدِينَ
    base('أَ'),                      // أَهْدِي
    base('نَ'),                      // نَهْدِي
  ];
  return { past, present };
}

function conjNaqisWaw(sg: string[]) {
  // sg = ["دَ","عَ","ا"]  — c1, c2, alif (representing final و)
  const c1 = bare(sg[0]), c2 = bare(sg[1]);
  const stem2 = sg[0] + sg[1]; // دَعَ
  const past = [
    stem2 + ALIF,                    // دَعَا
    stem2 + 'تْ',                    // دَعَتْ
    stem2 + WAW + FA + ALIF,         // دَعَوَا
    stem2 + 'تَا',                   // دَعَتَا
    stem2 + WAW + SK + ALIF,         // دَعَوْا
    stem2 + WAW + SK + 'نَ',         // دَعَوْنَ
    stem2 + WAW + SK + 'تَ',         // دَعَوْتَ
    stem2 + WAW + SK + 'تِ',         // دَعَوْتِ
    stem2 + WAW + SK + 'تُمَا',      // دَعَوْتُمَا
    stem2 + WAW + SK + 'تُمْ',       // دَعَوْتُمْ
    stem2 + WAW + SK + 'تُنَّ',      // دَعَوْتُنَّ
    stem2 + WAW + SK + 'تُ',         // دَعَوْتُ
    stem2 + WAW + SK + 'نَا',        // دَعَوْنَا
  ];
  const base = (p: string) => p + c1 + SK + c2 + DA + WAW; // يَدْعُو
  const present = [
    base('يَ'),                      // يَدْعُو
    base('تَ'),                      // تَدْعُو
    base('يَ') + FA + 'انِ',         // يَدْعُوَانِ
    base('تَ') + FA + 'انِ',         // تَدْعُوَانِ
    base('يَ') + 'نَ',               // يَدْعُونَ  (هم)
    base('يَ') + 'نَ',               // يَدْعُونَ  (هن)
    base('تَ'),                      // تَدْعُو
    base('تَ') + KA + 'ينَ',         // تَدْعِينَ
    base('تَ') + FA + 'انِ',         // تَدْعُوَانِ
    base('تَ') + 'نَ',               // تَدْعُونَ  (أنتم)
    base('تَ') + 'نَ',               // تَدْعُونَ  (أنتن)
    base('أَ'),                      // أَدْعُو
    base('نَ'),                      // نَدْعُو
  ];
  return { past, present };
}

function conjMithalWaw(sg: string[], mudV: 'a' | 'i' | 'u') {
  // Past is identical to strong (و is regular in past tense)
  const c2 = bare(sg[1]), c3 = bare(sg[2]);
  return {
    past:    pastSuffixes(sg[0] + sg[1], c3),
    present: presentSuffixes(p => p + c2 + vmark(mudV) + c3),
  };
}

function conjMithalYa(sg: string[], mudV: 'a' | 'i' | 'u') {
  const c2 = bare(sg[1]), c3 = bare(sg[2]);
  return {
    past:    pastSuffixes(sg[0] + sg[1], c3),
    present: presentSuffixes(p => p + c2 + vmark(mudV) + c3),
  };
}

function conjMudaaf(sg: string[], mudV: 'a' | 'i' | 'u') {
  // sg = ["مَ","دَّ"]  — c1+vowel, c2+shadda+vowel
  const c1 = bare(sg[0]), c2 = bare(sg[1]);
  const mv = vmark(mudV);
  // gemin = stem with shadda (no final haraka): e.g. "مَدّ"
  const gemin   = sg[0] + c2 + SH;
  // degemin = separated stem: e.g. "مَدَدْ"
  const degemin = sg[0] + c2 + FA + c2 + SK;
  const past = [
    norm(gemin + FA),               // مَدَّ
    norm(gemin + FA + 'تْ'),        // مَدَّتْ
    norm(gemin + FA + ALIF),        // مَدَّا
    norm(gemin + FA + 'تَا'),       // مَدَّتَا
    norm(gemin + DA + 'وا'),        // مَدُّوا
    norm(degemin + 'نَ'),           // مَدَدْنَ
    norm(degemin + 'تَ'),           // مَدَدْتَ
    norm(degemin + 'تِ'),           // مَدَدْتِ
    norm(degemin + 'تُمَا'),        // مَدَدْتُمَا
    norm(degemin + 'تُمْ'),         // مَدَدْتُمْ
    norm(degemin + 'تُنَّ'),        // مَدَدْتُنَّ
    norm(degemin + 'تُ'),           // مَدَدْتُ
    norm(degemin + 'نَا'),          // مَدَدْنَا
  ];
  // gemin_pres(p) = prefix + c1+mudariVowel + c2+shadda  (e.g. يَمُدّ)
  const gp = (p: string) => p + c1 + mv + c2 + SH;
  // dgemin_pres(p) = prefix + c1+sukun + c2+mudariVowel + c2+sukun  (e.g. يَمْدُدْ)
  const dp = (p: string) => p + c1 + SK + c2 + mv + c2 + SK;
  const present = [
    norm(gp('يَ') + DA),            // يَمُدُّ
    norm(gp('تَ') + DA),            // تَمُدُّ
    norm(gp('يَ') + FA + 'انِ'),    // يَمُدَّانِ
    norm(gp('تَ') + FA + 'انِ'),    // تَمُدَّانِ
    norm(gp('يَ') + DA + 'ونَ'),    // يَمُدُّونَ
    norm(dp('يَ') + 'نَ'),          // يَمْدُدْنَ
    norm(gp('تَ') + DA),            // تَمُدُّ
    norm(gp('تَ') + KA + 'ينَ'),    // تَمُدِّينَ
    norm(gp('تَ') + FA + 'انِ'),    // تَمُدَّانِ
    norm(gp('تَ') + DA + 'ونَ'),    // تَمُدُّونَ
    norm(dp('تَ') + 'نَ'),          // تَمْدُدْنَ
    norm(gp('أَ') + DA),            // أَمُدُّ
    norm(gp('نَ') + DA),            // نَمُدُّ
  ];
  return { past, present };
}

// ── Derived forms ─────────────────────────────────────────────────
// For all derived forms, past = pastSuffixes on the last two segs.
// Present uses form-specific prefix+stem patterns.

function conjForm2(sg: string[]) {
  // sg = ["عَ","لَّ","مَ"]  — c1, c2+shadda, c3
  const c1 = bare(sg[0]), c2 = bare(sg[1]), c3 = bare(sg[2]);
  return {
    past:    pastSuffixes(sg[0] + sg[1], c3),
    present: presentSuffixes(p => p + c1 + FA + c2 + SH + KA + c3, DA_PREFS),
  };
}

function conjForm3(sg: string[]) {
  // sg = ["هَ","ا","جَ","رَ"]  — c1, alif, c2, c3
  const c1 = bare(sg[0]), c2 = bare(sg[2]), c3 = bare(sg[3]);
  return {
    past:    pastSuffixes(sg[0] + sg[1] + sg[2], c3),
    present: presentSuffixes(p => p + c1 + FA + ALIF + c2 + KA + c3, DA_PREFS),
  };
}

function conjForm4(sg: string[]) {
  // 3-seg case: sg[0]="آ" (root-initial hamzah merged with Form IV prefix أَ)
  // 4-seg case: sg[0]="أَ" (prefix), sg[1]=c1+SK, sg[2]=c2, sg[3]=c3
  const c3 = bare(sg[sg.length - 1]);
  const pre = sg.slice(0, -1).join('');
  const past = pastSuffixes(pre, c3);

  let stemFn: (p: string) => string;
  if (sg[0] === ALIF_MADD) {
    // "آمَنَ" — use ؤ (hamzah on waw) as the Form IV present initial
    const c2 = bare(sg[1]);
    stemFn = p => p + HAMZA_WAW + SK + c2 + KA + c3;
  } else {
    // "أَكْرَمَ" — normal: skip أَ prefix, c1=sg[1], c2=sg[2], c3 already above
    const c1 = bare(sg[1]), c2 = bare(sg[2]);
    stemFn = p => p + c1 + SK + c2 + KA + c3;
  }
  return { past, present: presentSuffixes(stemFn, DA_PREFS) };
}

function conjForm5(sg: string[]) {
  // sg = ["تَ","عَ","لَّ","مَ"]  — تَ prefix, c1, c2+shadda, c3
  const c1 = bare(sg[1]), c2 = bare(sg[2]), c3 = bare(sg[3]);
  return {
    past:    pastSuffixes(sg[0] + sg[1] + sg[2], c3),
    present: presentSuffixes(p => p + 'تَ' + c1 + FA + c2 + SH + FA + c3),
  };
}

function conjForm6(sg: string[]) {
  // sg = ["تَ","كَ","ا","تَ","بَ"]  — تَ prefix, c1, alif, c2, c3
  const c1 = bare(sg[1]), c2 = bare(sg[3]), c3 = bare(sg[4]);
  return {
    past:    pastSuffixes(sg[0] + sg[1] + sg[2] + sg[3], c3),
    present: presentSuffixes(p => p + 'تَ' + c1 + FA + ALIF + c2 + FA + c3),
  };
}

function conjForm7(sg: string[]) {
  // sg = ["اِ","نْ","كَ","سَ","رَ"]  — اِنْ prefix, c1, c2, c3
  const c1 = bare(sg[2]), c2 = bare(sg[3]), c3 = bare(sg[4]);
  return {
    past:    pastSuffixes(sg[0] + sg[1] + sg[2] + sg[3], c3),
    present: presentSuffixes(p => p + 'نْ' + c1 + FA + c2 + KA + c3),
  };
}

function conjForm8(sg: string[]) {
  // sg = ["اِ","جْ","تَ","مَ","عَ"]  — اِ prefix, c1+SK, تَ infix, c2, c3
  const c1 = bare(sg[1]), c2 = bare(sg[3]), c3 = bare(sg[4]);
  return {
    past:    pastSuffixes(sg[0] + sg[1] + sg[2] + sg[3], c3),
    present: presentSuffixes(p => p + c1 + SK + 'تَ' + c2 + KA + c3),
  };
}

function conjForm10(sg: string[]) {
  // sg = ["اِ","سْ","تَ","غْ","فَ","رَ"]  — اِسْتَ prefix, c1+SK, c2, c3
  const c1 = bare(sg[3]), c2 = bare(sg[4]), c3 = bare(sg[5]);
  return {
    past:    pastSuffixes(sg[0] + sg[1] + sg[2] + sg[3] + sg[4], c3),
    present: presentSuffixes(p => p + 'سْتَ' + c1 + SK + c2 + KA + c3),
  };
}

function conjForm4Ajwaf(sg: string[]) {
  // sg = ["أَ","جَ","ا","بَ"]  — أَ prefix, c1, alif, c2
  // Past: elongated (أَجَابَ) for هو/هي/هما/هم; contracted (أَجَبْ) for rest.
  // Present: يُجِيبُ pattern (ajwaf_ya stem with damma prefixes).
  const c1 = bare(sg[1]), c2 = bare(sg[3]);
  const elongPre = sg[0] + sg[1] + ALIF;       // أَجَا
  const contrPre = sg[0] + c1 + FA + c2 + SK;  // أَجَبْ
  const past = [
    norm(elongPre + c2 + FA),           // أَجَابَ
    norm(elongPre + c2 + FA + 'تْ'),    // أَجَابَتْ
    norm(elongPre + c2 + FA + ALIF),    // أَجَابَا
    norm(elongPre + c2 + FA + 'تَا'),   // أَجَابَتَا
    norm(elongPre + c2 + DA + 'وا'),    // أَجَابُوا
    norm(contrPre + 'نَ'),              // أَجَبْنَ
    norm(contrPre + 'تَ'),              // أَجَبْتَ
    norm(contrPre + 'تِ'),              // أَجَبْتِ
    norm(contrPre + 'تُمَا'),           // أَجَبْتُمَا
    norm(contrPre + 'تُمْ'),            // أَجَبْتُمْ
    norm(contrPre + 'تُنَّ'),           // أَجَبْتُنَّ
    norm(contrPre + 'تُ'),              // أَجَبْتُ
    norm(contrPre + 'نَا'),             // أَجَبْنَا
  ];
  const base      = (p: string) => p + c1 + KA + YA + c2;  // يُجِيب
  const contrPres = (p: string) => p + c1 + KA + c2 + SK;  // يُجِبْ
  const present = [
    norm(base('يُ') + DA),              // يُجِيبُ
    norm(base('تُ') + DA),              // تُجِيبُ
    norm(base('يُ') + FA + 'انِ'),      // يُجِيبَانِ
    norm(base('تُ') + FA + 'انِ'),      // تُجِيبَانِ
    norm(base('يُ') + DA + 'ونَ'),      // يُجِيبُونَ
    norm(contrPres('يُ') + 'نَ'),       // يُجِبْنَ
    norm(base('تُ') + DA),              // تُجِيبُ
    norm(base('تُ') + KA + 'ينَ'),      // تُجِيبِينَ
    norm(base('تُ') + FA + 'انِ'),      // تُجِيبَانِ
    norm(base('تُ') + DA + 'ونَ'),      // تُجِيبُونَ
    norm(contrPres('يُ') + 'نَ'),       // يُجِبْنَ  (هن)
    norm(base('أُ') + DA),              // أُجِيبُ
    norm(base('نُ') + DA),              // نُجِيبُ
  ];
  return { past, present };
}

// ── Main export ───────────────────────────────────────────────────

export function conjugateVerb(verb: VerbInput): { past: string[]; present: string[] } {
  // Manual override takes precedence (partial or full)
  const override = verb.conjugation;
  if (override?.past && override?.present) {
    return { past: override.past, present: override.present };
  }

  const sg = splitSegs(verb.madi);
  const mudV = verb.mudariVowel ?? 'u';

  let generated: { past: string[]; present: string[] };

  switch (verb.type) {
    case 'strong':      generated = conjStrong(sg, mudV);    break;
    case 'ajwaf_waw':   generated = conjAjwafWaw(sg);        break;
    case 'ajwaf_ya':    generated = conjAjwafYa(sg);         break;
    case 'naqis_ya':    generated = conjNaqisYa(sg);         break;
    case 'naqis_waw':   generated = conjNaqisWaw(sg);        break;
    case 'mithal_waw':  generated = conjMithalWaw(sg, mudV); break;
    case 'mithal_ya':   generated = conjMithalYa(sg, mudV);  break;
    case 'mudaaf':      generated = conjMudaaf(sg, mudV);    break;
    case 'form2':       generated = conjForm2(sg);           break;
    case 'form3':       generated = conjForm3(sg);           break;
    case 'form4':       generated = conjForm4(sg);           break;
    case 'form4_ajwaf': generated = conjForm4Ajwaf(sg);     break;
    case 'form5':       generated = conjForm5(sg);           break;
    case 'form6':       generated = conjForm6(sg);           break;
    case 'form7':       generated = conjForm7(sg);           break;
    case 'form8':       generated = conjForm8(sg);           break;
    case 'form10':      generated = conjForm10(sg);          break;
    default:
      throw new Error(`Unknown verb type: ${(verb as VerbInput).type}`);
  }

  // Allow partial overrides (only past or only present)
  return {
    past:    override?.past    ?? generated.past,
    present: override?.present ?? generated.present,
  };
}
