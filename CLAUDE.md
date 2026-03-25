# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**On first message, also read `HANDOFF.md` for full project context, current priorities, and conversation history.**

## Overview

Personal academic website for Roger D. Newman-Norlund, PhD — cognitive neuroscientist at USC. Built with **plain HTML and CSS only** — no frameworks, no build step, no bundler, no package manager. Dark techy theme with monospace/code aesthetic.

**Live site:** https://rnorlund.github.io
**Repo:** https://github.com/rnorlund/rnorlund.github.io.git

## Site Structure (multi-page)

| File | Content |
|---|---|
| `index.html` | Landing: hero with photo, stats, featured banners (allt.ai + BLUM paper), highlight cards |
| `about.html` | Bio, career timeline, education, awards & memberships |
| `research.html` | Research areas (tags), 6 theme cards, selected invited talks |
| `projects.html` | 8 project/initiative cards (ABC, C-STAR, McCausland, Brainchop, etc.) |
| `publications.html` | 38+ publications with JS year-filter buttons (All/2026/2025/2024/2023/Older) |
| `teaching.html` | Current & past courses, Governor's School outreach, mentoring |
| `grants.html` | Current, pending, and completed grants on a timeline |
| `contact.html` | Contact cards + online profile links |
| `blog.html` | Static HTML blog posts (hardcoded, no JS needed) |
| `working.html` | Lab project board with localStorage JS (team workload chart, member chips) |
| `style.css` | All styles — dark theme, CSS custom properties in `:root` |
| `roger.jpeg` | The ONLY photo of Roger used on the site |
| `adaptive_gravity_sort_paper.pdf` | AGS paper PDF linked from blog |

## Design System

- **Theme:** Dark background (`#0a0e17`) with subtle green grid overlay
- **Accent colors:** Green (`--accent: #06d6a0`), Purple (`--accent2: #7c3aed`), Cyan (`--cyan: #22d3ee`)
- **Fonts:** Inter (body) + JetBrains Mono (headings, labels, code) via Google Fonts
- **Responsive breakpoint:** 640px
- **Design tokens:** All in `:root` — change theme by modifying CSS custom properties

## Key Conventions

- **One photo only:** `roger.jpeg` — never use external image URLs
- **Nav:** Every page has identical nav with `class="active"` on the current page link
- **Blog posts:** Hardcoded as `<article class="blog-post">` blocks in blog.html — no localStorage, everyone can read them
- **Working board:** Only page with JS — uses localStorage (`lab-projects-v1`), BroadcastChannel sync, team member chips
- **Publications:** Have a JS year-filter (data-year attributes on `<li>` elements)
- **Featured section** on index.html: allt.ai (green banner) and BLUM paper (purple banner) — these are Roger's primary current projects

## Adding a Blog Post

Add a new `<article class="blog-post">` block inside the `.blog-posts` div in `blog.html`, above existing posts (newest first):

```html
<article class="blog-post">
  <div class="blog-post-date">Month Day, Year</div>
  <div class="blog-post-title">Post Title Here</div>
  <div class="blog-post-body">
    <p>Paragraph text...</p>
  </div>
</article>
```

Use standard HTML inside the body: `<p>`, `<ul>/<li>`, `<strong>`, `<em>`, `<code>`, `<a>`.

## Development

Open any `.html` file directly in a browser — no server required.

## Deployment

GitHub Pages from `main` branch. Push to deploy. Site at https://rnorlund.github.io.
