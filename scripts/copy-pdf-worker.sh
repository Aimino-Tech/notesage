#!/bin/bash

# Create necessary directories
mkdir -p public/pdf-worker
mkdir -p public/cmaps

# Copy PDF.js worker and its dependencies - Correct path
cp node_modules/pdfjs-dist/build/pdf.worker.min.js public/pdf-worker/
cp -r node_modules/pdfjs-dist/cmaps/* public/cmaps/

echo "PDF.js worker files copied to public directory"
