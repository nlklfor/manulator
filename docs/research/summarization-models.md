# Summarization models
  
  Story: #142 · Author: <name> · Last updated: <date>
  
  ## Question
  
  Which model writes a short, correct English summary of a manuscript, so a researcher can
  quickly tell whether it is relevant? A researcher might want to read the full text, but a summary can help them decide whether it is worth the effort.
  Also a a researcher might want to tell how he want to summarize the text, i.e. briefly, in detail, etc.

  ## A first try
  Flan-T5-base might be a good first option, because it is trained on a wide range of tasks and can be prompted to summarize text. It is possible to tell the model how it should summarize (briefly, in detail, etc.)
  It has not been tested yet, but it might be a good option for noisy input (OCR errors, abbreviations, spelling variations).
  
  If the the performance is low, we can try fine-tuning it on a small set of Latin summaries. 
  The training data could be the same as for the translation model, but with English summaries instead of translations.

  However, fine tuning flan-t5-base on data with long input sequences is difficult, because it has a maximum input length of 512 tokens. 
  The input text might be longer than that, so we would have to truncate it or split it into chunks. This is very time consuming and might lead to loss of information and lower performance.
  
  A alternative approach is to fine tune LongT5, which can handle longer input sequences. 
  However, it is a larger model and might require more resources to train and run.

  ## What we tried
  No tests and no fine tuning conducted yet

  ## Train Data
  ***Dataset***
  
Possible training datasets for text summarization are: 
- LatinSummarizer Dataset: https://huggingface.co/datasets/LatinNLP/latin-summarizer-dataset
- https://huggingface.co/datasets/LatinNLP/LatinSummarizer
- prg-unibe/dodis-historical-documents: https://huggingface.co/datasets/prg-unibe/dodis-historical-documents/viewer/default/train?row=0
- ccdv/arxiv-summarization: https://huggingface.co/datasets/ccdv/arxiv-summarization?utm_source=chatgpt.com
- launch/gov_report: https://huggingface.co/datasets/launch/gov_report/viewer/plain_text/train?row=0
- kmfoda/booksum: https://huggingface.co/datasets/kmfoda/booksum?utm_source=chatgpt.com
- SAMSum: https://huggingface.co/datasets/knkarthick/samsum
  [LatinNLP/latin-summarizer-dataset](https://huggingface.co/datasets/LatinNLP/latin-summarizer-dataset)

  ## Fine tuning Plan for LongT5
  In case Flan-T5-base does perform well, we can adapt the following training plan: 
- Use a subset of kmfoda/booksum and fine tune LongT5 on it. The subset should be small enough to fit in the GPU memory, but large enough to learn the task.
- Then train the model on prg-unibe/dodis-historical-documents. By training the model on this dataset it will learn to summarize (older) document contents. This Dataset contains content about politics, history, and culture.
- Finally fine tune the LongT5 model on LatinNLP/latin-summarizer-dataset. This dataset contains content about politics, history, and culture. It is a small dataset, but it is in Latin and it is relevant to our task.
- As evaluation metric we can use ROUGE, which is a common metric for summarization tasks. It measures the overlap between the generated summary and the reference summary. We can also use BLEU, which is another common metric for summarization tasks. It measures the overlap between the generated summary and the reference summary.
  ## Test data
  We can create a small set of texts, and use it to evaluate the performance of the model. The test data should be different from the training data, but it should be similar in terms of content and style. We can use the same datasets as for training, but we should select different texts for testing.

  ## Results                                      
  
  ## Decision
  
  ## Limitations

  ## Sources

  -
