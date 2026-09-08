# ASLP Anatomy Studio — launch notes

Browser-based 3D teaching studio for B.ASLP (RCI 2024-25) and postgraduate audiology / SLP.

Version 1.0 uses educational schematic models so the product can be deployed immediately.

## Preview locally
python3 -m http.server 4173
Open http://localhost:4173

## Vercel
Framework: Other
Build command: empty
Output directory: .
Or: npx vercel --yes

## Cloudflare Pages
Build command: empty
Output directory: /
Direct upload of this folder also works.

Do not upload node_modules.
