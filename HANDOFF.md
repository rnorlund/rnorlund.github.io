# HANDOFF.md

Context for resuming work on Roger's website if starting a new conversation.

## Who is Roger

Roger D. Newman-Norlund, PhD — Research Associate Professor in the Dept. of Communication Sciences & Disorders at USC (University of South Carolina). Cognitive neuroscientist studying brain aging, aphasia, mirror neurons, and AI/ML applied to neuroimaging. Has 88+ publications, 2,300+ citations, 20+ years in the field. Wife Sarah also works in the lab.

## Current Primary Projects

1. **allt.ai** — Roger's main project right now. AI-powered tools at the intersection of neuroscience and language technology. Featured prominently on homepage with green banner. Docs at `/Documents/ALTAI_docs/`, logo assets at `/Documents/alltailogosvg/`.

2. **BLUM: Brain-LLM Understanding Model** — Key paper testing whether LLMs that make human-like speech errors show human-like lesion patterns. Featured on homepage with purple banner. arXiv link is placeholder (paper ID not yet assigned). Code at `/Documents/BLUM_Paper_arXiv/`.

3. **Adaptive Gravity Sort** — Physics-inspired sorting algorithm paper. First blog post is about this. Paper PDF is in the repo. Code at `/Desktop/Sorter/`.

## CV Source

`CV_2026.docx` is in the repo root (not committed to git). Contains full employment history, education, all 88+ publications, conference abstracts, grants, teaching, mentoring, and service. Used to populate the site content.

## Blog Monitoring Baseline

A baseline snapshot of `/Users/super/Documents/` project folders was taken on **2026-03-25**. This is stored in Claude's memory system. When Roger asks "update blog with what I did today," compare current file modification dates against this baseline using:
```bash
find /Users/super/Documents/<folder> -type f -newermt "2026-03-25"
```
Key folders to monitor: BLUM_Paper_arXiv, alltailogosvg, ABC_LLM, fin, fin_onlyErrors, SriyaRogerProject, WAB_Sentence_Completion_Playground, PNT_LLAVA_Playground, SYLLABLE_BASED_LLM_Playground, Roger_webSite, praneshPaper, and ~15 others.

## Git Remote

- **Remote:** https://github.com/rnorlund/rnorlund.github.io.git
- **Branch:** main
- **Deploy:** GitHub Pages auto-deploys from main

## What's Been Done (this conversation)

1. Started with single-page site with old photos and light theme
2. Redesigned with dark techy theme (monospace, grid background, green/purple/cyan accents)
3. Replaced all external photos with local `roger.jpeg` only
4. Converted from single-page to multi-page (9 separate HTML pages + index)
5. Populated all pages with data from CV_2026.docx
6. Added featured banners for allt.ai and BLUM paper on homepage
7. Created static blog with first post about Adaptive Gravity Sort
8. Included `adaptive_gravity_sort_paper.pdf` in repo, linked from blog
9. Fixed blog typography (tightened spacing, styled code/bold/lists)

## Working Board (working.html)

Uses localStorage with key `lab-projects-v1`. Team members: Kalil, Yong, Xiang, Nadra, Saeed, Ben, Regan, Roger — each with color-coded chips. Has export/import JSON and BroadcastChannel cross-tab sync.

## Style Notes

- Roger prefers concise, direct communication
- Site should stay techy-looking (dark theme, monospace fonts, code aesthetic)
- Only use roger.jpeg for photos — no external image URLs
- Blog posts should be personal and connect research to broader themes
