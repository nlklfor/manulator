// One transcribed line of a manuscript page.
export interface TranscriptionLine {
  n: number;
  text: string; // current text (the original, or the user's correction)
  originalText: string | null; // the model's reading if the line was corrected, otherwise null
  confidence: number | null;
  lowConfWords: number[];
  boundary: [number, number][];
}
