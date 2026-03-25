# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal academic website for Roger D. Newman-Norlund, PhD (cognitive neuroscientist at USC). Built with **plain HTML and CSS only** — no frameworks, no build step, no bundler, no package manager.

## Architecture

- **index.html** — Single-page site with all content and inline JavaScript. Sections: Hero, About, Research, Projects, Publications, Contact, and a "Working…" project board.
- **style.css** — All styles, using CSS custom properties (design tokens in `:root`). Teal accent (`--accent: #0891b2`). Mobile-responsive at 600px breakpoint.

### Working… Project Board (inline JS in index.html)

An interactive lab project board embedded as an IIFE at the bottom of `index.html` (~330 lines). Key details:
- **State**: stored in `localStorage` under key `lab-projects-v1`; synced across tabs via `BroadcastChannel` and `storage` events.
- **Team members**: hardcoded `MEMBERS` array with name, initials, and color. Each project card has toggleable member-assignment chips.
- **Tab mode**: clicking "Working…" nav link adds `body.tab-working` class, which hides all other sections (CSS-driven isolation). Other nav links restore normal scrolling view.
- **Export/Import**: JSON file download/upload for sharing project data between teammates.

## Development

Open `index.html` directly in a browser — no server required. For live reload during development, use any static file server (e.g., `python3 -m http.server`).

## Deployment

Hosted via GitHub Pages. Push to `main` branch and the site deploys automatically. See README.md for setup instructions.

## Key Conventions

- All images are externally hosted (USC/Squarespace CDNs) — no local image assets.
- Inter font loaded from Google Fonts.
- CSS uses `var(--token)` design tokens consistently; modify `:root` variables to change the theme.
- Navigation uses anchor links to section IDs, except "Working…" which uses JS-driven tab switching.
