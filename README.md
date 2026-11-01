# EyeUtility Graph

A knowledge graph of published health-state utility values (HSUVs) in eye disease: 95 studies and 249 values across 16 groups of eye conditions, linked by study, condition, health state, instrument and country.

**Live site:** https://tuohai1992.github.io/eye-graph/

## What is in it

| | |
|---|---|
| Studies | 95 (from 9,060 Europe PMC records; 177 screened at abstract level) |
| Values | 249 utility levels, decrements and gains |
| Conditions | Glaucoma & OHT, AMD, diabetic retinopathy & DME, inherited retinal disease, floaters & retinal detachment, cataract, myopia & refractive error, dry eye & Sjögren's, keratoconus, ocular surface inflammation, uveitis, thyroid eye disease, neuro-ophthalmology, strabismus, anophthalmia & other, visual impairment (mixed causes) |
| Methods | TTO, standard gamble, rating scale, EQ-5D (3L/5L/Y), HUI3, SF-6D, CHU-9D, AQoL-7D, 15D, VFQ-UI, VisQoL, HUG-5 |

## Files

- `index.html` – the site (Story, 3D graph, value browser, method notes). Opens in any modern browser; needs internet for the chart library and fonts.
- `data/values.csv` – one row per extracted value, with PMID, condition, health state, instrument, method class, value type, value, dispersion, respondent type and notes.
- `data/studies.csv` – one row per included study.
- `data/screening_log.csv` – decision and reason for every screened record (included, full text needed, excluded).
- `data/eye-graph.json` – the full dataset used by the site, including the record flow.
- `worker/` – optional Cloudflare Worker that answers **Ask** questions for visitors without a Claude account; see `worker/README.md`.

## Method

1. Europe PMC search: about 70 eye-condition and vision terms combined with a utility term block (utility, EQ-5D, time trade-off, standard gamble, HUI, SF-6D, CHU-9D, AQoL, QALY); MEDLINE records with abstracts.
2. Rule-based pre-screen: removed letters, editorials and similar article types; records not about an eye condition; and records whose title and abstract contain no utility-type number. Cost-effectiveness models (82) and reviews (13) were set aside.
3. Abstract screening and extraction of the remaining 177 records. A study was included when its abstract reports a preference-based utility value, decrement or gain for people with an eye condition.
4. Every extracted value and sample size was checked by script against the abstract text.

## Limits

- Values come from abstracts only; subgroup values reported only in full-text tables are missing (see the full-text queue in the screening log).
- Screening and extraction were AI-assisted (Claude) without independent dual human review.
- Countries are recorded only where the abstract names them.
- Some values come from clinicians, the general public, carers, students or parent proxies rather than patients; these are labelled by respondent type.
- A few values are derived from what the abstract reports (for example a stated decrement) and are flagged.

## Acknowledgement

Structure and workflow inspired by [EQ-Graph](https://github.com/abundance-ds/eq-graph) by Abundance Decision Systems. This project is independent and not affiliated with EuroQol or Abundance Decision Systems.

## Licence

Code (`index.html`) is released under the MIT licence; see `LICENSE`. Data in `data/` is released under CC BY 4.0; see `data/LICENSE.md`. Cite the original studies when using their values.
