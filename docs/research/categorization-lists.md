# Categorization test set (#195)

Test pages with known answers, to compare image AIs (#191) and prompts (#205) on the same pages.
The answers are in [`categorization-test-set.csv`](categorization-test-set.csv), one row per page.
The images are on the team Drive.

Status: draft. 8 of about 30 pages filled (the Königsfelden charters). The lists below are a
proposal to agree on in the team.

## Allowed answers

Every property allows `unknown`. The AI must answer with exactly one value from the list.

| Property | Allowed values |
|---|---|
| century | `VIII`, `IX`, `X`, `XI`, `XII`, `XIII`, `XIV`, `XV`, `XVI`, `XVII`, `unknown` |
| script | CLaMM's 12 classes, named as in `classifiers/script.md`: `Caroline`, `Cursiva`, `Half-Uncial`, `Humanistic`, `Humanistic Cursive`, `Hybrida`, `Praegothica`, `Semihybrida`, `Semitextualis`, `Southern Textualis`, `Textualis`, `Uncial`, plus `unknown` |
| language | `Latin`, `French`, `German`, `Italian`, `Spanish`, `English`, `Dutch`, `Greek`, `Hebrew`, `other`, `unknown` |
| region | `Switzerland`, `Germany`, `France`, `Italy`, `Spain`, `England`, `Low Countries`, `Central Europe`, `other`, `unknown` |
| document_type | `charter`, `codex`, `register`, `other`, `unknown` |

## Rules

- **century:** the century the page was written in. A page dated 1300 is `XIII`, 1301 is `XIV`.
  If a source gives a range across two centuries, use `unknown`.
- **script:** CLaMM's classes are the base (#195 step 3). Names from other datasets are mapped to
  them; add the mapping here when you use one. CATMuS' "Gothic Documentary Script" has no CLaMM
  class (see `classifiers/script.md`); map it to `Cursiva` only if the team agrees.
  Only fill it in if the source names the script or someone who can tell has checked the image.
- **language:** the language of the main text, from the source's metadata. In the app it will be
  detected from the corrected text, not the image (#176).
- **region:** the modern country of the place where the page was written (so Strasbourg is
  `France`). Not the place where it is kept today. `classifiers/region.md` has no fixed list yet;
  if we use CATMuS pages, map its `region` column onto this list. `Central Europe` covers Austria, Bohemia,
  Hungary and Poland.
- **document_type:** by layout, as defined in `classifiers/document-type.md`. Illuminated pages
  count as `codex`. `other` is blank pages, covers, fragments and printed pages.
- **source:** a link to the page or the dataset, plus shelfmark and folio, so anyone can check
  the answer.

## Pages still to add (target about 30, spread over the categories)

| Kind | Source | Known from the source | How many |
|---|---|---|---|
| Registers | e-NDP, Notre-Dame registers ([Zenodo 7575693](https://zenodo.org/records/7575693), CC BY 4.0) | Latin, France (Paris), date of each register (1326–1504) | 4 |
| Codex pages from several centuries | e-codices (catalogue entry gives date, place, language) | century, language, region | 8 |
| Pages with a known script | CLaMM (labelled script and date) | script, century | 6 |
| Vernacular pages | CATMuS (genre, script, century, language) | script, century, language | 3 |
| Other | a blank page, a cover, a printed page | document type | 2 |

Avoid pages whose source we did not record: the internal document-type test pages
(`classifiers/document-type-test-pages.csv`) can only be used where the source column says where
they come from.
