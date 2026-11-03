# Summarization models
  
  Story: #142 · Author: <name> · Last updated: <date>
  
  ## Question
  
  Which model writes a short, correct English summary of a manuscript, so a researcher can
  quickly tell whether it is relevant?

  ## A first try
  Flan-T5 might be a good option, because it is trained on a wide range of tasks and can be prompted to summarize text. It has not been tested yet, but it might be a good option for noisy input (OCR errors, abbreviations, spelling variations).
  If we the performance is low, we can try fine-tuning it on a small set of Latin summaries. The training data could be the same as for the translation model, but with English summaries instead of translations.
  
  ## What we tried
  No tests and no fine tuning conducted yet

  ## Train Data
  [LatinNLP/latin-summarizer-dataset](https://huggingface.co/datasets/LatinNLP/latin-summarizer-dataset)
  
  
  ## Test data
  
  ## Results                                      
  
  ## Decision
  
  ## Limitations

  ## Sources

  -
