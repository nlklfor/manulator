// Classifier benchmark. Colours and fonts are Manulator's own (frontend/src/app/globals.css).
// Fonts (free, OFL): IBM Plex Sans, IBM Plex Mono, Literata from fonts.google.com.
// Without them Typst falls back to its default fonts. Build: typst compile benchmark.typ
// CLaMM numbers: ml/results/clamm_predictions.jsonl, scored with ml/eval/clamm_classification.py.
// Charter numbers: the charter logs in ml/results/ (local_*.txt, bench_*.txt).

// ---------- Theme ----------
#let paper = rgb("#faf7f1")         // mt-surface
#let raised = rgb("#fffdf9")        // mt-raised: chart cards
#let sunken = rgb("#e6dfd1")        // mt-sunken
#let border = rgb("#ddd4c3")        // mt-border
#let grid-line = rgb("#ece6da")
#let axis = rgb("#b9ae99")          // mt-border-strong
#let ink = rgb("#211d17")           // mt-text
#let muted = rgb("#6c6353")         // mt-text-subtle
#let accent = rgb("#2b4e9e")        // mt-accent
#let rubric = rgb("#b3301f")        // the red of the logo: reference lines

// One colour per model, the same in every chart. Claude blue, Gemini green, local models sand.
#let models = (
  gemini: (name: "Gemini 3 Flash", short: [Gemini 3\ Flash], color: rgb("#2f7a68")),
  sonnet: (name: "Claude Sonnet 5.5", short: [Claude\ Sonnet 5.5], color: accent),
  haiku: (name: "Claude Haiku 5.5", short: [Claude\ Haiku 5.5], color: rgb("#7f97cf")),
  gemma: (name: "Gemma 4 12B", short: [Gemma 4\ 12B], color: rgb("#8f7f62")),
  qwen9: (name: "Qwen3.5-9B", short: [Qwen3.5\ 9B], color: rgb("#b5a588")),
  qwen4: (name: "Qwen3.5-4B", short: [Qwen3.5\ 4B], color: rgb("#d6cab3")),
)

#set page(paper: "a4", margin: (x: 1.8cm, y: 1.6cm), fill: paper,
  footer: context text(size: 7.5pt, fill: muted)[Manulator · Classifier benchmark · 22 November 2026 #h(1fr) #counter(page).display()])
#set text(font: ("IBM Plex Sans", "Liberation Sans"), size: 9.5pt, fill: ink)
#show raw: set text(font: ("IBM Plex Mono", "DejaVu Sans Mono"), size: 8pt)

// ---------- Chart parts ----------

#let swatch(color) = box(rect(width: 8pt, height: 8pt, fill: color, radius: 1.5pt))

// A chart card: title, one line of context, the chart, and an optional note below
#let chart-card(title, subtitle, body, note: none) = block(width: 100%, fill: raised,
  stroke: 0.6pt + border, radius: 4pt, inset: (x: 12pt, top: 11pt, bottom: 10pt), breakable: false, {
  text(size: 10pt, weight: 600, title)
  linebreak()
  text(size: 7.5pt, fill: muted, subtitle)
  v(10pt)
  body
  if note != none {
    v(-8pt)
    text(size: 7pt, fill: muted, note)
  }
})

// Y axis: light grid lines with their values at the left
#let y-axis(height, width, max, ticks, tick-label) = {
  for t in ticks {
    let y = height - height * t / max
    place(dx: 22pt, dy: y, line(length: width - 22pt, stroke: 0.5pt + grid-line))
    place(dy: y - 4pt, box(width: 18pt, align(right, text(size: 6.5pt, fill: muted, tick-label(t)))))
  }
  place(dx: 22pt, dy: height, line(length: width - 22pt, stroke: 0.8pt + axis))
}

// Bar chart, one bar per model. items: ((model key, value), ...) or (key, value, label)
#let bar-chart(items, max: 100, unit: "%", ticks: (0, 25, 50, 75, 100), tick-label: t => str(t) + "%",
  height: 2.6cm, refs: ()) = layout(size => {
  let width = size.width
  let lx = 22pt
  let slot = (width - lx) / items.len()
  let bar = calc.min(slot * 0.56, 34pt)
  box(width: width, height: height + 22pt, {
    y-axis(height, width, max, ticks, tick-label)
    for (i, item) in items.enumerate() {
      let model = models.at(item.at(0))
      let value = item.at(1)
      let label = if item.len() > 2 { item.at(2) } else { str(value) + unit }
      let h = height * value / max
      let x = lx + i * slot
      place(dx: x + (slot - bar) / 2, dy: height - h, rect(width: bar, height: h, fill: model.color, radius: (top: 1.5pt)))
      place(dx: x, dy: height - h - 11pt, box(width: slot, align(center, text(size: 7.5pt, weight: 600, label))))
      place(dx: x, dy: height + 4pt, box(width: slot, align(center, text(size: 6.5pt, fill: muted, model.short))))
    }
    for (value, label) in refs {
      let y = height - height * value / max
      place(dx: lx, dy: y, line(length: width - lx, stroke: (paint: rubric, thickness: 0.7pt, dash: "dashed")))
      place(dx: width - 70pt, dy: y - 9pt, box(width: 70pt, align(right, text(size: 6.5pt, fill: rubric, label))))
    }
  })
})

// Grouped bar chart: one group per metric, one bar per model, value on top
#let grouped-chart(metrics, keys, values, height: 2.9cm, refs: (), max: 100,
  ticks: (0, 25, 50, 75, 100), tick-label: t => str(t) + "%", fmt: v => str(v)) = layout(size => {
  let width = size.width
  let lx = 22pt
  let group = (width - lx) / metrics.len()
  let slot = group * 0.82 / keys.len()
  let bar = slot * 0.76
  align(left, keys.map(k => swatch(models.at(k).color) + h(4pt) + text(size: 7.5pt, models.at(k).name)).join(h(11pt)))
  v(12pt)
  box(width: width, height: height + 18pt, {
    y-axis(height, width, max, ticks, tick-label)
    for (g, metric) in metrics.enumerate() {
      let x0 = lx + g * group + group * 0.09
      for (i, k) in keys.enumerate() {
        let value = values.at(i).at(g)
        let h = height * value / max
        place(dx: x0 + i * slot + (slot - bar) / 2, dy: height - h,
          rect(width: bar, height: h, fill: models.at(k).color, radius: (top: 1.5pt)))
        place(dx: x0 + i * slot - 4pt, dy: height - h - 10pt, box(width: slot + 8pt, align(center,
          text(size: 7pt, weight: 600, fmt(value)))))
      }
      place(dx: lx + g * group, dy: height + 5pt, box(width: group, align(center,
        text(size: 8.5pt, weight: 600, metric))))
    }
    for (g, value, label) in refs {
      let y = height - height * value / max
      place(dx: lx + g * group + group * 0.04, dy: y, line(length: group * 0.92,
        stroke: (paint: rubric, thickness: 0.7pt, dash: "dashed")))
      place(dx: lx + g * group + group * 0.04, dy: y - 9pt, text(size: 6.5pt, fill: rubric, label))
    }
  })
})

// 100% stacked bars: century answers split into right / one century off / further off
#let outcome-chart(rows) = layout(size => {
  let colors = (accent, rgb("#9fb2df"), rgb("#dba597"))
  let names = ("Right century", "One century off", "Further off")
  align(left, names.zip(colors).map(((n, c)) => swatch(c) + h(4pt) + text(size: 7.5pt, n)).join(h(12pt)))
  v(8pt)
  let label-w = 2.7cm
  let w = size.width - label-w
  for (key, counts) in rows {
    let total = counts.sum()
    grid(columns: (label-w, w), align: (left + horizon, left + horizon),
      text(size: 8pt, models.at(key).name),
      stack(dir: ltr, ..counts.zip(colors).map(((n, c)) => {
        let share = n / total
        box(width: w * share, height: 12pt, fill: c, align(center + horizon,
          if share > 0.07 { text(size: 7pt, weight: 600, fill: if c == accent { white } else { ink },
            str(calc.round(share * 100)) + "%") }))
      })),
    )
    v(3pt)
  }
})

// Right answers per script, shaded from cream (0) to ink blue (20)
#let heat-map(scripts, rows, top: 20, fmt: v => str(v)) = table(
  columns: (2.7cm,) + (1fr,) * scripts.len(),
  inset: (x: 2pt, y: 5pt),
  align: center + horizon,
  stroke: 1.5pt + raised,
  table.header([], ..scripts.map(s => text(size: 6.5pt, fill: muted, s))),
  ..rows.map(((key, values)) => (
    align(left, text(size: 8pt, models.at(key).name)),
    ..values.map(v => table.cell(
      fill: if v == 0 { sunken.transparentize(40%) } else { accent.transparentize(100% - (15% + v / top * 80%)) },
      text(size: 7.5pt, weight: 500, fill: if v > top / 2 { white } else { ink }, fmt(v)),
    )),
  )).flatten(),
)

// Scores from 0 to 1 shown with two decimals, e.g. 0.47
#let fmt2(v) = {
  let r = int(calc.round(v * 100))
  if r >= 100 { "1.00" } else { "0." + (if r < 10 { "0" } else { "" }) + str(r) }
}

// Number with two decimals, e.g. 0.80 or 1.32
#let dec2(v) = {
  let r = int(calc.round(v * 100))
  let cents = calc.rem(r, 100)
  str(calc.quo(r, 100)) + "." + (if cents < 10 { "0" } else { "" }) + str(cents)
}

// Metrics table; the best value in each column is bold
#let metric-table(rows) = {
  let best(col, lower) = {
    let vals = rows.map(r => r.at(1).at(col))
    if lower { calc.min(..vals) } else { calc.max(..vals) }
  }
  let lower-better = (false, false, false, false, false, false, false, false, true)
  table(
    columns: (2.7cm, auto) + (1fr,) * 9,
    align: (left, right) + (right,) * 9,
    inset: (x: 4pt, y: 5pt),
    stroke: (x, y) => (bottom: if y == 1 { 0.8pt + axis } else { 0.4pt + grid-line }),
    table.header(
      [], [], table.cell(colspan: 5, align: center, text(size: 7.5pt, weight: 600)[Script (12 classes)]),
      table.cell(colspan: 4, align: center, text(size: 7.5pt, weight: 600)[Century (7 classes)]),
      ..([Model], [Pages], [Accuracy], [Precision], [Recall], [Macro F1], [κ], [Accuracy], [Macro F1], [κ], [Mean error]).map(h => text(size: 7pt, fill: muted, h)),
    ),
    ..rows.map(((key, vals)) => (
      text(size: 8pt, models.at(key).name),
      text(size: 8pt, str(vals.at(0))),
      ..range(1, 10).map(c => {
        let v = vals.at(c)
        let shown = if c == 9 { dec2(v) } else { fmt2(v) }
        text(size: 8pt, weight: if v == best(c, lower-better.at(c - 1)) { 700 } else { 400 }, shown)
      }),
    )).flatten(),
  )
}

// ---------- Report ----------

#text(font: ("Literata", "Libertinus Serif"), size: 22pt, weight: 600)[Classifier benchmark]
#v(-8pt)
#text(size: 9.5pt, fill: muted)[Script and century from a page image: 240 expert-labelled CLaMM 2017 pages (20 per script) and 8 of our charters, same prompt for every model. Claude at low effort, Gemini 3 Flash (preview) at low thinking, Qwen3.5-4B with greedy decoding, Gemma 4 12B and Qwen3.5-9B with their local server's default settings.]
#v(4pt)

#chart-card("Metrics on 240 CLaMM pages", "Precision, recall and F1 are macro averages, so every script and every century counts equally. κ: Cohen's kappa, agreement with the experts beyond chance (0 = chance, 1 = perfect).",
  metric-table((
    ("sonnet", (240, 0.496, 0.597, 0.496, 0.468, 0.453, 0.688, 0.637, 0.611, 0.48)),
    ("haiku", (240, 0.229, 0.243, 0.229, 0.176, 0.164, 0.483, 0.395, 0.365, 0.80)),
    ("gemma", (240, 0.171, 0.150, 0.171, 0.103, 0.095, 0.308, 0.249, 0.160, 1.32)),
    ("qwen4", (238, 0.122, 0.052, 0.121, 0.060, 0.041, 0.109, 0.114, 0.035, 1.80)),
    ("qwen9", (240, 0.100, 0.129, 0.100, 0.049, 0.018, 0.183, 0.152, 0.073, 1.60)),
  )),
  note: [Century classes: 10th century or earlier, then 11th to 16th; answers outside them (e.g. 17th century) count as wrong. Mean error: distance in centuries between the answer and the expert century, not between classes; a page from before 1000 counts as 0 for any answer up to the 10th century (lower is better). Qwen3.5-4B gave no usable answer on 2 pages. The best CLaMM competition system (2017) reached 85% script accuracy.],
)

#v(6pt)
#chart-card("Script", "Macro scores over the 12 scripts, 0 to 1",
  grouped-chart(
    ("Macro F1", "Macro precision", "Macro recall", "Cohen's κ"),
    ("sonnet", "haiku", "gemma", "qwen4", "qwen9"),
    ((0.468, 0.597, 0.496, 0.453), (0.176, 0.243, 0.229, 0.164), (0.103, 0.150, 0.171, 0.095),
     (0.060, 0.052, 0.121, 0.041), (0.049, 0.129, 0.100, 0.018)),
    max: 1, ticks: (0, 0.25, 0.5, 0.75, 1), tick-label: t => str(t), fmt: fmt2,
  ),
)

#v(6pt)
#chart-card("Century", "Macro F1, accuracy and κ over 7 century classes, 0 to 1",
  grouped-chart(
    ("Macro F1", "Accuracy", "Cohen's κ"),
    ("sonnet", "haiku", "gemma", "qwen4", "qwen9"),
    ((0.637, 0.688, 0.611), (0.395, 0.483, 0.365), (0.249, 0.308, 0.160), (0.114, 0.109, 0.035), (0.152, 0.183, 0.073)),
    max: 1, ticks: (0, 0.25, 0.5, 0.75, 1), tick-label: t => str(t), fmt: fmt2,
  ),
)

#chart-card("F1 per script", "F1 for each of the 12 scripts, 0 to 1",
  heat-map(
    ("Caroline", "Cursiva", "Half-Uncial", "Huma-nistic", "Hum. Cursive", "Hybrida",
     "Prae-gothica", "Semi-hybrida", "Semi-textualis", "S. Textualis", "Textualis", "Uncial"),
    (
      ("sonnet", (0.509, 0.216, 0.167, 0.766, 0.6, 0.388, 0.791, 0.0, 0.095, 0.791, 0.773, 0.519)),
      ("haiku", (0.27, 0.246, 0.0, 0.095, 0.55, 0.227, 0.196, 0.148, 0.0, 0.0, 0.375, 0.0)),
      ("gemma", (0.143, 0.234, 0.0, 0.368, 0.174, 0.0, 0.0, 0.0, 0.08, 0.0, 0.238, 0.0)),
      ("qwen4", (0.0, 0.3, 0.0, 0.233, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.185, 0.0)),
      ("qwen9", (0.0, 0.048, 0.0, 0.0, 0.095, 0.077, 0.0, 0.0, 0.081, 0.077, 0.205, 0.0)),
    ),
    top: 1, fmt: v => if v == 0 { "0" } else { fmt2(v) },
  ),
  note: [Sonnet reads 15 of the 20 Cursiva pages as Hybrida, so its Cursiva F1 is low. The local models score low F1 on Textualis too: they answer it for most pages, so their precision is low.],
)

#v(6pt)
#grid(columns: (1fr, 1fr), gutter: 8pt,
  chart-card("Mean century error", "Distance in centuries from the expert date; lower is better",
    bar-chart((("sonnet", 0.48, "0.48"), ("haiku", 0.80, "0.80"), ("gemma", 1.32, "1.32"), ("qwen9", 1.60, "1.60"), ("qwen4", 1.80, "1.80")),
      max: 2, unit: "", ticks: (0, 0.5, 1, 1.5, 2), tick-label: t => str(t))),
  chart-card("Answers \"Textualis\"", "Share of each model's answers. Only 8% of the pages are Textualis.",
    bar-chart((("sonnet", 10), ("haiku", 32), ("qwen9", 61), ("gemma", 62), ("qwen4", 74)),
      refs: ((8, [real share: 8%]),))),
)

#v(6pt)
#grid(columns: (1fr, 1fr), gutter: 8pt,
  chart-card("Charters: century", "8 charters (Basel, Konstanz, Säckingen, Strasbourg, one unknown), 1291–1462",
    bar-chart((("gemini", 5), ("haiku", 5), ("gemma", 3), ("qwen9", 2), ("qwen4", 1)),
      max: 8, unit: "/8", ticks: (0, 2, 4, 6, 8), tick-label: t => str(t)),
    note: [Accuracy only: 8 charters are too few for F1. Language 8/8 and document type 7–8/8 for every model run. Sonnet not run (no API credit left). Gemma and Qwen3.5-9B: better of two runs.]),
  chart-card("Gemini sample", "Pages right out of 11 Caroline pages (3 from outside the 240)",
    grouped-chart(
      ("Script", "Century"),
      ("gemini", "sonnet", "haiku", "gemma", "qwen9", "qwen4"),
      ((11, 8), (9, 7), (2, 1), (1, 0), (0, 1), (0, 0)),
      max: 11, ticks: (0, 3, 6, 9, 11), tick-label: t => str(t), height: 2.9cm,
    ),
    note: [Accuracy only: one script, so F1 is not meaningful. Gemini ran on the free tier (20 requests a day). Qwen3.5-4B answered 9 of the 11 pages.]),
)
