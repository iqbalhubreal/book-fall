BOOK FALL — SPLIT SOURCE PACKAGE
================================

Folder contents
---------------
index.html                  Main page structure
styles.css                  Original page styling
js/main.js                  Loader that assembles and starts the JavaScript
js/parts/01...17.js          Seventeen ordered JavaScript source fragments

How to run
----------
1. Extract the ZIP while keeping the folder structure intact.
2. Open the extracted folder in VS Code.
3. Start index.html with the Live Server extension.
   You can also use any local web server that serves files over HTTP/HTTPS.

Do not open index.html directly with file://. The loader uses fetch() to read
its source fragments, which requires an HTTP/HTTPS origin.

About the JavaScript pieces
---------------------------
The original Book Fall engine uses many shared top-level variables and functions.
To preserve its behavior without rewriting that engine, main.js fetches the
17 fragments in numerical order, joins them into one ES module, and executes it.
The numbered files are source fragments, not independent modules. Keep their
names and order unchanged, and edit a fragment in place when making changes.

The original Three.js import map and external library URLs are retained in
index.html. A working internet connection is needed to load those libraries.
