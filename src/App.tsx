import React, { useState, useEffect } from 'react'
import './App.css'
import Tesseract from 'tesseract.js'
import Dropzone from 'react-dropzone'
import ReactLoading from 'react-loading'
import * as pdfjsLib from 'pdfjs-dist'
import { CopyToClipboard } from 'react-copy-to-clipboard'

pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.15.349/pdf.worker.js'

function findCBUsInText (text: string): string[] {
  return Array.from(text.matchAll(/[0-9\- ]+/g))
    .map((res) => res[0].replace(/\D/g, ''))
    .filter((res) => res.length === 22)
}

async function readImage (f: File): Promise<string[]> {
  if (f.type.split('/')[0] !== 'image') return []
  return await Tesseract.recognize(
    f,
    'spa'
  ).then(({ data: { text } }) => findCBUsInText(text))
}

async function readPDF (f: File): Promise<string[]> {
  if (f.type !== 'application/pdf') return []
  const loadingTask = pdfjsLib.getDocument(new Uint8Array(await f.arrayBuffer()))
  const pdf = await loadingTask.promise
  let cbus: string[] = []

  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1)
    const texts = await page.getTextContent()
    for (const item of texts.items) {
      cbus = [...cbus, ...findCBUsInText((item as { str?: string }).str ?? '')]
    }
  }
  return cbus
}

function fileListToFileArray (f?: FileList): File[] {
  const files: File[] = []
  if (f !== undefined) {
    for (let i = 0; i < f.length; i++) {
      const item = f.item(i)
      if (item !== null) {
        files.push(item)
      }
    }
  }
  return files
}

function App (): JSX.Element {
  const [results, setResults] = useState<string[] | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [copied, setCopied] = useState('')
  const [error, setError] = useState(false)

  const readContent = (acceptedFiles: File[], text: string): void => {
    (async (): Promise<void> => {
      setResults(null)
      setProgress(0)
      const results = await Promise.all(acceptedFiles.map(async (f) => {
        const [resultsPDF, resultsImage] = await Promise.allSettled([readPDF(f), readImage(f)])
        return [
          ...(resultsPDF.status === 'fulfilled' ? resultsPDF.value : []),
          ...(resultsImage.status === 'fulfilled' ? resultsImage.value : [])
        ]
      }))
      setResults([...results.flat(), ...(findCBUsInText(text ?? ''))])
      setProgress(1)
    })().catch((err: Error) => {
      console.error({ err })
      setError(true)
    })
  }
  const onDrop = (acceptedFiles: File[]): void => {
    readContent(acceptedFiles, '')
  }

  useEffect(() => {
    const onPaste = (event: unknown): void => {
      ((event: ClipboardEvent): void => {
        readContent(
          fileListToFileArray(event.clipboardData?.files),
          event.clipboardData?.getData('text/plain') ?? ''
        )
      })(event as ClipboardEvent)
    }
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  return (
    <div className="App">
      {!error && results === null && progress === null && <Dropzone onDrop={onDrop}>
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()} id="dropzone">
            <input {...getInputProps()} />
            <p>Subime tu imagen con un CBU acá</p>
          </div>
        )}
      </Dropzone>}
      {!error && results === null && progress !== null && <div id="loading"><ReactLoading type="bars" color="#333" /></div>}
      {(error || results !== null) && <div id="results">
        <div>
          {!error && results !== null && results.length > 0 && <ul>{results.map((r: string, i) => (
            <li key={i}>
              <p>{r}</p>
              <CopyToClipboard text={r}
                onCopy={() => { setCopied(r) }}>
                <button>{r === copied ? 'Copiado' : 'Copiar'}</button>
              </CopyToClipboard>
            </li>
          ))}</ul>}
          {!error && results !== null && results.length === 0 && <div id="noresults"><p>No se encontraron CBUs</p></div>}
          {error && <div id="noresults"><p>Algo salió mal...</p></div>}
          <button onClick={() => { setResults(null); setProgress(null) }}>Volver a empezar</button>
        </div>
      </div>}
    </div>
  )
}

export default App
