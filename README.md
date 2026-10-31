# My Roblox Games Tracker

A simple static site to track Roblox games you've played or plan to play. Hosted free on GitHub Pages.

## Features

- **Title, Description, Cover image** for each game
- **Status tracking**: Played / Plan to Play
- **Star ratings** (1-5)
- **Filter buttons** to view all, played, or planned games
- **Direct links** to Roblox game pages
- **Responsive design** — works on mobile

## Quick Start

### 1. Add your games

Edit `games.json` — each game needs:

```json
{
  "id": "unique-string",
  "title": "Game Name",
  "description": "Your thoughts...",
  "cover": "https://image-url.jpg",
  "status": "played" | "plan-to-play",
  "rating": 0-5,
  "dateAdded": "YYYY-MM-DD",
  "robloxUrl": "https://www.roblox.com/games/..."
}
```

**Cover images**: Use Roblox's CDN format: `https://tr.rbxcdn.com/180deg-450x270/{PLACE_ID}.png`  
Find the Place ID in the game's URL.

### 2. Deploy to GitHub Pages

1. Create a new repo on GitHub
2. Push this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOURUSER/roblox-games.git
   git push -u origin main
   ```
3. Go to **Settings → Pages** → Source: "Deploy from a branch" → Branch: `main` → `/ (root)`
4. Your site lives at `https://YOURUSER.github.io/roblox-games/`

### 3. Update games

Just edit `games.json` and push — GitHub Pages rebuilds automatically.

## Customization

- Edit `style.css` for colors/spacing
- Modify `index.html` for layout changes
- Add fields to `games.json` and `script.js` for more data

## No Build Step

Pure HTML/CSS/JS — no Node, no build, no dependencies.