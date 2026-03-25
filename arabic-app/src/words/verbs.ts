// ─────────────────────────────────────────────────────────────────
// src/words/verbs.ts
// Add new verbs here. One object per verb. App reloads instantly.
// Sources: almaany.com/en/dict/ar-en · corpus.quran.com
// ─────────────────────────────────────────────────────────────────
import type { Verb } from "../App";

export const VERBS: Verb[] = [
  // ── TEMPLATE — copy this block and fill in for each new verb ──
  // {
  //   id: "kataba",                        // unique English key, no spaces
  //   ar: "كَتَبَ",                         // Arabic with full harakat
  //   root: "ك-ت-ب",                        // three root letters with dashes
  //   form: "Form I",                       // Form I … Form X
  //   meaning: "to write",                  // primary English meaning
  //   meanings: [                           // all meanings
  //     "to write",
  //     "to prescribe / ordain",
  //     "to record / register",
  //   ],
  //   sentence: "فَوَيْلٌ لِلَّذِينَ يَكْتُبُونَ الْكِتَابَ بِأَيْدِيهِمْ",   // example sentence (Arabic)
  //   sentenceTr: "Woe to those who write the scripture with their own hands (Quran 2:79)",
  //   contexts: [
  //     { s: "يَكْتُبُونَ الْكِتَابَ", t: "They write the scripture", m: "physical writing (Quran 2:79)" },
  //     { s: "كُتِبَ عَلَيْكُمُ الصِّيَامُ", t: "Fasting has been prescribed for you", m: "divine decree (Quran 2:183)" },
  //     { s: "كَتَبَ القَاضِي الحُكْمَ", t: "The judge wrote the verdict", m: "legal/administrative use" },
  //   ],
  //   masdar: "كِتَابَة / كَتْب",
  //   fail: "كَاتِب",
  //   mafool: "مَكْتُوب",
  //   conjugation: {
  //     // 13 pronouns: هو هي هما(م) هما(ف) هم هن أنت أنت أنتما أنتم أنتن أنا نحن
  //     past:    ["كَتَبَ","كَتَبَتْ","كَتَبَا","كَتَبَتَا","كَتَبُوا","كَتَبْنَ","كَتَبْتَ","كَتَبْتِ","كَتَبْتُمَا","كَتَبْتُمْ","كَتَبْتُنَّ","كَتَبْتُ","كَتَبْنَا"],
  //     present: ["يَكْتُبُ","تَكْتُبُ","يَكْتُبَانِ","تَكْتُبَانِ","يَكْتُبُونَ","يَكْتُبْنَ","تَكْتُبُ","تَكْتُبِينَ","تَكْتُبَانِ","تَكْتُبُونَ","تَكْتُبْنَ","أَكْتُبُ","نَكْتُبُ"],
  //   },
  // },
];
