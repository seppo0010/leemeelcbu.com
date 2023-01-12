import React, { useState, useEffect } from 'react';
import './App.css';
import Tesseract from 'tesseract.js';
import Dropzone from 'react-dropzone'
import ReactLoading from 'react-loading';
import * as pdfjsLib from "pdfjs-dist";
import {CopyToClipboard} from 'react-copy-to-clipboard';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.15.349/pdf.worker.js`;

function findCBUsInText(text: string): string[] {
  return Array.from(text.matchAll(/[0-9\- ]+/g))
    .map((res) => res[0].replace(/\D/g,''))
    .filter((res) => res.length === 22)
}

async function readImage(f: File): Promise<string[]> {
  if (f.type.split('/')[0] !== 'image') return [];
  return await Tesseract.recognize(
    f,
    'spa',
  ).then(({ data: { text } }) => findCBUsInText(text))
}

async function readPDF(f: File): Promise<string[]> {
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

function fileListToFileArray(f?: FileList): File[] {
  const files: File[] = [];
  if (f !== undefined) {
    for (let i = 0; i < f.length; i++) {
      const item = f.item(i);
      if (item !== null) {
        files.push(item);
      }
    }
  }
  return files;
}

function App() {
  const [results, setResults] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState('');

  const readContent = async (acceptedFiles: File[], text: string) => {
    setResults(null);
    setProgress(0);
    const results = await Promise.all(acceptedFiles.map(async (f) => {
      const [resultsPDF, resultsImage] = await Promise.allSettled([readPDF(f), readImage(f)]);
      return [
        ...(resultsPDF.status === 'fulfilled' ? resultsPDF.value : []),
        ...(resultsImage.status === 'fulfilled' ? resultsImage.value : []),
      ];
    }));
    setResults([...results.flat(), ...(findCBUsInText(text ?? ''))])
    setProgress(1);
  }
  const onDrop = (acceptedFiles: File[]) => readContent(acceptedFiles, '')

  useEffect(() => {
    const onPaste = (event: unknown) => ((event: ClipboardEvent) => {
      readContent(
        fileListToFileArray(event.clipboardData?.files),
        event.clipboardData?.getData('text/plain') ?? '',
      );
    })(event as ClipboardEvent)
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    }
  }, []);

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
