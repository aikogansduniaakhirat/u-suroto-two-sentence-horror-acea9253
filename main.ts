/**
 * Two-Sentence Horror — make.fun bounty entry.
 *
 * The brief: a horror story in exactly two sentences, <= 400 characters.
 * Judged on (1) genuinely frightening in two sentences, (2) the second
 * sentence turns the first so it reads worse the second time, (3) horror
 * implied rather than explained, (4) every word earned, (5) original.
 *
 * The line is kept as structured notes and rendered, so the story is
 * composed rather than pasted: the parts that carry the scare are separate
 * fields, and the renderer is where the sentence order and the punctuation
 * beats live.
 */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Notes = {
  /** Sentence 1 opens on the harmless, domestic, measurable thing. */
  setup: string;
  /** Sentence 2 is the reveal; it must retroactively worsen sentence 1. */
  reveal: string;
};

const MIN_CHARS = 1;
const MAX_CHARS = 400; // the bounty's published gate
const TARGET_CHARS = 260; // keep headroom; Size is the tie-break

/**
 * NOTES — the story as parts.
 *
 * setup:  a smoke alarm low-battery chirp is the most mundane domestic
 *         annoyance there is, and it is *scheduled*: it repeats on a fixed
 *         interval, so a time can be attached to it without straining belief.
 *         The narrator takes the battery out and keeps it in his hand, which
 *         is a small, odd, entirely human act of proof.
 * reveal: the same interval sounds again from inside the wall. Nothing is
 *         explained. The reader supplies the worst of it.
 */
const NOTES: Notes = {
  setup:
    "Our smoke alarm has chirped at 2:14 every night this week, so last night I took the battery out and slept with it in my hand.",
  reveal: "At 2:14 the chirp came from inside the wall.",
};

/**
 * Cut candidates, and which criterion killed each:
 *
 * Cut: "I count the stairs up in the dark, thirteen to the landing, the way
 *   I have since I was six. Last night there were fourteen, and the extra
 *   one was warm." (151 — the warmer staircase is the strongest single
 *   image here, but "warm" explains the scare as *contact*; criterion 3
 *   wants the reader to supply the worst, and a counted stair makes the
 *   horror arithmetic instead of implied.)
 * Cut: "One voicemail from my own number, forty-one seconds of my kitchen
 *   with the tap dripping. At half speed there is someone breathing along
 *   with me, half a beat behind." (164 — the breathing partner is good, but
 *   "at half speed" makes the narrator an audio engineer, and the premise
 *   needs a device the reader has to be told about. Too much machinery.)
 * Cut: "My mother still puts a second cup out at breakfast, and I have
 *   stopped correcting her. This morning it was already poured, and she has
 *   been in the ground since March." (166 — grief-horror, and the last
 *   clause explains the whole thing in a date. Criterion 3 dies on it.)
 * Cut: "My dog growls at the hallway every night at 3:40, so I trained
 *   myself to sleep through it. Last night he slept on the floor, and at
 *   3:40 something under my blanket growled, warm against my back." (194 —
 *   closest runner-up. Loses on criterion 5: the wrong-thing-in-the-bed
 *   reveal is one of the most retold shapes in the form, and "warm against
 *   my back" is doing the same explaining work as the stairs.)
 *
 * Why the smoke alarm survives all five: nobody is harmed, nothing is seen,
 * and the two facts are a maintenance annoyance and a direction. The first
 * read is a man solving a trivial problem; the second read is a week of
 * something in the house keeping a schedule and using the alarm to teach him
 * when to expect it. The battery in his hand is the only evidence, and it is
 * evidence he was holding all along.
 */

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

function composeStory(n: Notes): string {
  const setup = n.setup.trim();
  const reveal = n.reveal.trim();
  if (!setup || !reveal) refuse("a part of the story is empty");
  return `${setup} ${reveal}`;
}

function countChars(text: string): number {
  return Array.from(text).length; // code points: what the gate counts
}

function gate(text: string): void {
  const chars = countChars(text);

  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    refuse(`${chars} characters, the gate allows ${MIN_CHARS} to ${MAX_CHARS}`);
  }
  if (chars > TARGET_CHARS) {
    refuse(`${chars} characters is over the local budget of ${TARGET_CHARS}`);
  }
  if (text.trim().length === 0) refuse("white space only");
  if (text.includes("\n") || text.includes("\r")) refuse("not one line");
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/ {2,}/.test(text)) refuse("doubled spaces");
  if (!/^[\x20-\x7E]+$/.test(text)) {
    refuse("non-ASCII: bytes would diverge from the character count");
  }
  if (/\b(undefined|NaN|null)\b|\[object Object\]/.test(text)) {
    refuse("template hole in the composed text");
  }

  // The brief is *exactly two sentences*, so the sentence count is a gate,
  // not a style note. Count terminators that actually end a sentence.
  const sentenceEnds = (text.match(/[.!?](?=\s|$)/g) ?? []).length;
  if (sentenceEnds !== 2) {
    refuse(`${sentenceEnds} sentence ends, the brief asks for exactly two`);
  }

  // The turn has to be in the second sentence, so sentence 2 must name the
  // thing sentence 1 was about (the alarm), otherwise the reveal floats free.
  const second = text.slice(text.indexOf(". ") + 2);
  if (!/wall|inside|behind/i.test(second)) {
    refuse("the second sentence does not carry the reveal");
  }
}

function main(): void {
  const text = composeStory(NOTES);
  gate(text);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  // No trailing newline: the Size column counts bytes.
  writeFileSync(outPath, text, "utf8");

  const onDisk = readFileSync(outPath, "utf8");
  if (onDisk !== text) refuse("disk differs from the composed story");

  const chars = countChars(onDisk);
  const bytes = Buffer.byteLength(onDisk, "utf8");
  process.stderr.write(`wrote ${chars} characters / ${bytes} bytes\n`);
}

main();
