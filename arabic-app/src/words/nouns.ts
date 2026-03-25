// ─────────────────────────────────────────────────────────────────
// src/words/nouns.ts
// Add new nouns here. One object per noun. App reloads instantly.
// Sources: almaany.com/en/dict/ar-en · corpus.quran.com
// ─────────────────────────────────────────────────────────────────
import type { Noun } from "../App";

export const NOUNS: Noun[] = [
  // ── TEMPLATE — copy this block and fill in for each new noun ──
  // {
  //   id: "kitab",                          // unique English key
  //   ar: "كِتَاب",                          // Arabic with full harakat
  //   root: "ك-ت-ب",                         // three root letters
  //   meaning: "book",                       // primary English meaning
  //   sentence: "قَرَأَ الطَّالِبُ الكِتَابَ كُلَّهُ",   // example sentence
  //   sentenceTr: "The student read the entire book",
  //   plurals: [
  //     { ar: "كُتُب", type: "جمع تكسير", meaning: "books — same meaning", shift: false },
  //     { ar: "كِتَابَات", type: "جمع مؤنث سالم", meaning: "writings/texts — broader", shift: true },
  //     // shift: true = the plural has a different or expanded meaning
  //   ],
  //   contexts: [
  //     { s: "كِتَابُ اللهِ", t: "The Book of Allah", m: "Quranic — the Quran" },
  //     { s: "كِتَابٌ مُفِيد", t: "A useful book", m: "everyday usage" },
  //   ],
  //   synonym: {
  //     ar: "مُصْحَف",
  //     meaning: "a physical copy of the Quran",
  //     distinction: "كِتَاب is any book; مُصْحَف is only a physical copy of the Quran",
  //   },
  //   antonym: {
  //     ar: "جَهْل",
  //     meaning: "ignorance — contextual opposite",
  //   },
  // },
];
