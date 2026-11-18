# Verification of Gemini's answers

Checked on 16.11.2026 by comparing Gemini's answers with the Latin text, sentence by sentence, and for U-17_0002_r with the expert summary in the Staatsarchiv Aargau catalogue

## Result

Gemini's answers are reliable on these 3 charters: no wrong person, place, amount or date. Two small additions and one meaningless line were found, listed below

## Checked against an independent source

U-17_0002_r against the [Staatsarchiv Aargau catalogue entry](https://www.ag.ch/staatsarchiv/suche/detail.aspx?ID=494464):

| Fact | Catalogue | Gemini |
| --- | --- | --- |
| Sellers | Konrad, Ulrich, Johannes, Wernher of Reitnau | same |
| Buyer | Arnold Trutman of Beromünster | same |
| What | tithes in Othmarsingen, Hendschiken, Dottikon, held from Säckingen | same |
| Price | 102 pounds of pennies | same |
| Consent | Adelheid von Kaiserstuhl, canoness of Säckingen | same |
| Yearly rent | 10 Malter of rye | 10 modii of rye (the Latin says "decem modios") |
| Date | 24 March 1311 | 24 March 1291 |

The year differs: the transcription reads "m cc lxxxxi" (1291) and "indictione iiii", and the 4th indiction fits 1291, not 1311. Gemini followed the text. Whether the catalogue or the transcription is right would need a look at the original

## Checked against the Latin

Correct on all 3 pages:

- Dates: "viiij kalendas aprilis" = 24 March, "iiii idus aprilis" = 10 April
- Amounts: 102 pounds, 10 + 9 modii of wheat, 1 malter of oats, 4 saums of wine, 7 and 200 marks of silver, about 100 persons
- Modern place names: Othwessingen = Othmarsingen, Henschinchon = Hendschiken, Dothinchon = Dottikon, Beronensis = Beromünster, Seconiensis = Säckingen, Cheiserstuol = Kaiserstuhl, Erlispach = Erlinsbach, Schintznach = Schinznach, Haspurg = Habsburg, Campus Regis = Königsfelden
- People: Queen Agnes of Hungary, Bishop John of Basel, the Council of Basel (1442)
- Careful where the text is unclear: "King Frederick" is not guessed further, missing names are marked "not stated"

## Problems found

- U-17_0002_r, sentence 5: the Latin sentence has no verb ("... hoc instrumentum seu presentem paginam fideliter."). Gemini added "be confirmed" without saying so. Plausible, but it is an addition
- U-17_0616_r, sentence 6: the Latin is incomplete ("cuius decem et septem"). Gemini added "[value is] seventeen [marks]" and marked it with brackets. Good
- U-17_0616_r, last line: "excerpta gratia Johannes Werneri" is a scribe's note. "Extracted by grace" is a literal guess with no meaning
- The same unit is translated differently: "modii" in the summary, "bushels" in the translation

## Limits of this check

- Only 3 charters, all from Königsfelden, all Latin, all from 1291 to 1442
- Gemini got the correct transcription. In the app it will get PyLaia's output, which has about 15% character errors on these pages. The next test should use PyLaia's text
- The check was done carefully but not by a professional Latinist
