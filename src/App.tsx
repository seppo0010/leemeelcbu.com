import React, { useState, useEffect } from 'react'
import './App.css'
import Dropzone from 'react-dropzone'
import ReactLoading from 'react-loading'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import {
  findCBUsInText,
  readImage,
  readPDF,
  fileListToFileArray
} from './cbu'

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

  const requestPermissions = (): void => {
    requestNotificationPermission().catch((e) => { console.error({ e }) })
  }
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
          <button onClick={() => { requestPermissions(); setResults(null); setProgress(null) }}>Volver a empezar</button>
        </div>
      </div>}
    </div>
  )
}

const requestNotificationPermission = async (): Promise<void> => {
  const permission = await window.Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permission not granted for Notification')
  }
}

export default App
