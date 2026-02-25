# Julius Fridriksson — Personal Website

A minimal personal website built with plain HTML & CSS. No frameworks, no build step.

---

## How to deploy to GitHub Pages (free hosting)

### Step 1 — Create a GitHub account
1. Go to [https://github.com](https://github.com) and click **Sign up**
2. Choose a username (e.g. `julius-fridriksson` or `juliusfri`) — **remember this username**, your site URL will be `https://<username>.github.io`
3. Verify your email address

### Step 2 — Create the special GitHub Pages repository
1. Once logged in, click the **+** icon (top-right) → **New repository**
2. Name it **exactly** `<username>.github.io` (replace `<username>` with your actual GitHub username)
   - Example: if your username is `juliusfri`, the repo name must be `juliusfri.github.io`
3. Set it to **Public**
4. Click **Create repository**

### Step 3 — Upload your files
1. Inside the new empty repository, click **uploading an existing file** (or drag files onto the page)
2. Upload all three files:
   - `index.html`
   - `style.css`
   - `README.md`
3. Scroll down and click **Commit changes**

### Step 4 — Enable GitHub Pages
1. Go to the repository **Settings** tab
2. Click **Pages** in the left sidebar
3. Under **Source**, select **Deploy from a branch**
4. Under **Branch**, choose `main` and click **Save**

### Step 5 — Visit your live site
After about 1–2 minutes, your site will be live at:

```
https://<username>.github.io
```

---

## Editing content

All placeholder text in `index.html` is marked with HTML comments like:

```html
<!-- EDIT: Replace this paragraph with your real bio -->
```

Search for `EDIT:` in `index.html` to find every section that needs your real content.

Key things to update:
- **Tagline** (hero section) — your actual job title and location
- **About** paragraphs — your real bio
- **Projects** — real project names, descriptions, and links
- **Contact** — your real email, GitHub URL, and LinkedIn URL
