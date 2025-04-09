import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { pdfjs } from 'react-pdf';

// Configure the PDF worker source provided by pdfjs-dist
// Use the path relative to the built output (usually the root)
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

createRoot(document.getElementById("root")!).render(<App />);
