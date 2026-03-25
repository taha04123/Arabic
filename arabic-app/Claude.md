# Arabic Learning App

## Project structure
- arabic-app/src/App.tsx — all UI and logic, never add word data here
- arabic-app/src/words/verbs.ts — verb data only, add new verbs here
- arabic-app/src/words/nouns.ts — noun data only, add new nouns here

## Word format
### Verb fields
id, ar, root, form, meaning, meanings[], sentence, sentenceTr,
contexts[{s,t,m}], masdar, fail, mafool,
conjugation.past[13], conjugation.present[13]

### Noun fields
id, ar, root, meaning, sentence, sentenceTr,
plurals[{ar,type,meaning,shift}], contexts[{s,t,m}],
synonym{ar,meaning,distinction}|null, antonym{ar,meaning}|null

## Conjugation pronoun order (13)
هو هي هما(م) هما(ف) هم هن أنت أنتِ أنتما أنتم أنتن أنا نحن

## Word sources
- corpus.quran.com — Quranic sentences and morphology
- almaany.com/en/dict/ar-en — meanings and daily life examples

## Rules
- All Arabic must have full harakat
- Always include 3 contexts per word (mix of Quran and daily life)
- Dev server: npm run dev (runs on localhost:5173)