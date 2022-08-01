import React, { useState } from 'react';
import './App.css';
import Tesseract from 'tesseract.js';
import Dropzone from 'react-dropzone'
import ReactLoading from 'react-loading';
import * as pdfjsLib from "pdfjs-dist";
import {CopyToClipboard} from 'react-copy-to-clipboard';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.15.349/pdf.worker.js`;

function findCBUsInText(text: string) {
  return Array.from(text.matchAll(/[0-9\- ]+/g))
    .map((res) => res[0].replace(/\D/g,''))
    .filter((res) => res.length === 22)
}
async function readImage(f: File) {
  if (f.type.split('/')[0] !== 'image') return [];
  return await Tesseract.recognize(
    f,
    'spa',
  ).then(({ data: { text } }) => findCBUsInText(text))
}

async function readPDF(f: File) {
  if (f.type !== 'application/pdf') return [];
  const loadingTask = pdfjsLib.getDocument(new Uint8Array(await f.arrayBuffer()));
  const pdf = await loadingTask.promise;
  let cbus: string[] = [];

  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i+1);
    const texts = await page.getTextContent();
    for (const item of texts.items) {
      cbus = [...cbus, ...findCBUsInText((item as any).str || '')]
    }
  }
  return cbus;
}

function App() {
  const [results, setResults] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState('');

  const onDrop = (acceptedFiles: File[]) => {
    setResults(null);
    setProgress(0);
    acceptedFiles.forEach(async (f) => {
      const [resultsPDF, resultsImage] = await Promise.allSettled([readPDF(f), readImage(f)]);
      setResults([
        ...(resultsPDF.status === 'fulfilled' ? resultsPDF.value : []),
        ...(resultsImage.status === 'fulfilled' ? resultsImage.value : []),
      ]);
      setProgress(1);
    })
  }
  return (
    <div className="App">
      {results === null && progress === null && <Dropzone onDrop={onDrop}>
        {({getRootProps, getInputProps}) => (
          <div {...getRootProps()} id="dropzone">
            <input {...getInputProps()} />
            <p>Subime tu imagen con un CBU acá</p>
          </div>
        )}
      </Dropzone>}
      {results === null && progress !== null && <div id="loading"><ReactLoading type="bars" color="#333" /></div>}
      {results !== null && <div id="results">
        {results.length === 0 && <p>No se encontraron CBUs</p>}
        {results.length > 0 && <div>
          <ul>{results.map((r: string, i) => (
            <li key={i}>
              <p>{r}</p>
              <CopyToClipboard text={r}
                onCopy={() => setCopied(r)}>
                <button>{r === copied ? 'Copiado' : 'Copiar'}</button>
              </CopyToClipboard>
            </li>
          ))}</ul>
          <button onClick={() => { setResults(null); setProgress(null); }}>Volver a empezar</button>
        </div>}
      </div>}
    </div>
  );
}

export default App;
