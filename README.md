# Our Recipes
Quick start: copy `.env.example` to `.env`, set your password, then `npm run dev` (auto-restarts on changes) or `npm start`.

Or run directly:  `ADMIN_PASSWORD=yourpassword node server.js`  → http://localhost:3000
(Windows PowerShell: `$env:ADMIN_PASSWORD="yourpassword"; node server.js`)

- Everyone can browse. Click **⚙ Admin** and enter the password to add/edit/delete recipes and upload photos.
- Data lives in `data/recipes.json`, photos in `data/uploads/`. Back up the `data` folder.
- Deploy anywhere that runs Node 18+ (Railway, Render, Fly.io, a VPS). Set `ADMIN_PASSWORD`, keep `data/` on a persistent volume, and serve over HTTPS.
