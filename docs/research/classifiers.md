# Classifiers and the multiple classifier system

Issues: #114, #115, #147–#150, #128 · Story: #145 · Author: <name> · Last updated: <date>

## Question

Which page properties do we classify, which classifier do we use for each, and how do we combine their results into one model suggestion (`model_id`)?

## Properties and mapping (#114)

Only properties that change which transcription model reads the page.

| Property | Values | Changes the model? | Classifier task |
|---|---|---|---|
| Document type | e.g. charter, register | | #147 |
| Script | e.g. Carolingian, Gothic textualis, cursiva | | #148 |
| Period | e.g. 13th c., 14th c. | | #149 |
| Region | e.g. France, German-speaking lands | | #150 |

Mapping table (combination → model):

| Combination | `model_id` |
|---|---|
| everything else / low confidence | general model (#124) + warning |

## What we tried (#115)

| Property | Model / approach | Source | Why we tried it |
|---|---|---|---|
| | | | |

One model with several outputs vs. separate models:

| | One model, several outputs | Separate models |
|---|---|---|
| Training effort | | |
| Memory / speed | | |
| Adding or changing a property | | |

## Test data

Labelled pages for each property: source, number of pages per value. Must not overlap our test pages.

## Results

| Property | Model | Accuracy | Notes (which values get confused?) |
|---|---|---|---|
| | | | |

Combined system (#128): how often is the suggested `model_id` right? How often is the warning shown?

## Decision

## Limitations

## Sources

- 
