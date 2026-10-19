# FashionCAD Studio

A browser-based fashion design and pattern learning studio. Static HTML, CSS and JavaScript on GitHub Pages. No login, no accounts, no terminal.

## Dress designer (new)
Open `dress-designer.html`. Pick a ready-made look or design from scratch: dress length, flare, waistline, neckline, sleeves, fabric (8 fabrics with real weave texture, prints, colours), belt, bow, buttons, lace/ruffle hem, jewellery, and your own body measurements. The 3D model shows it on a mannequin. **Download stitching guide (PDF)** gives: cover with 3 views, measurements, fabric amount, notions list, cutting list and layout, step-by-step stitching, and TRUE-SIZE pattern pages (A4, tiled with an assembly map). Print at 100% and check the 5 cm square.

## What works
- Every garment in the catalog opens with its own base pattern (front, back, sleeves, legs) sized to a body preset. Reshape it by dragging points, add points, make corners sharp or smooth
- 2D pattern editor: pencil, brush, eraser, line, rectangle, ellipse, polygon, curve, measure, text, colours and fills, seam allowance, exact sizes, undo/redo
- Pictures: insert a photo, cut part of it out with a loop, remove a plain background. Motifs (flower, heart, paisley, stripes and more), copy and paste between projects, and a My designs library
- Export SVG, PNG, DXF, print/PDF
- Garment catalog (291 garments) and fabric library (98 fabrics, sample values you can edit)
- 3D studio: adjustable mannequin, simple garment shapes, fabric materials, camera views. Your pattern's colours, drawings and pictures appear on the model, and its length, width and sleeve length shape it. Export PNG, GLB, OBJ
- Drape test: cloth simulation prototype with a drape coefficient
- Production: fabric estimate, costing, measurement sheet, tech pack (print/PDF), CSV
- Projects and profile saved in your browser, with backup and restore in Settings

## Where your data lives
Projects are saved in **this browser on this device**. They do not sync between devices. Clearing browser data, or using a private/incognito window, removes them. Use Settings, Download backup, now and then, and Restore from backup on another device.

## Honest limits
- Fabric numbers are teaching samples, not lab data
- The 3D model is a simple shape (nearest to your garment) that wears your pattern's colours and drawings and follows its main sizes. The pattern is not sewn onto the body, so cuts like a changed neckline or armhole shape do not change the 3D shape
- Pictures are shrunk to fit browser storage; very large or many pictures can fill it
- The drape test is a prototype, not calibrated to a real tester
- Fabric edits are saved in your browser only
- No accounts or cloud sync. Not included: FBX, PSD, AI export, body scanning

## Put it online
1. Create a public GitHub repository.
2. Upload all files to the repository root (not inside an extra folder).
3. Settings, Pages, deploy from `main` and `/ (root)`.
4. Open the Pages address. Opening the files directly from your computer will not work.

## Check everything
Open `health.html` on your site and press Run checks.

## Updating
Upload changed files with the same names and they replace the old ones. Files you delete from your computer are not deleted from GitHub; delete those in the repository itself.
