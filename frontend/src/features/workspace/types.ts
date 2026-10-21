// One transcribed line of a manuscript page.
// This is the shape the workspace page displays. The ML/backend side maps its
// recognition result into this list (see docs/frontend-workspace.md).
export interface TranscriptionLine {
  n: number; // line number, starting at 1
  text: string; // current text (the original, or the user's correction)
  confidence: number; // 0-100, how sure the model is about the whole line
  lowConfWords: number[]; // indices of words the model is unsure about
}
