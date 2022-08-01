import React, { useState } from 'react';
import './App.css';
import Tesseract from 'tesseract.js';
import Dropzone from 'react-dropzone'
import ReactLoading from 'react-loading';

function App() {
  const [results, setResults] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    setResults(null);
    setProgress(0);
    acceptedFiles.forEach((f) => {
      Tesseract.recognize(
        f,
        'spa',
        { logger: m => console.log(m) }
      ).then(({ data: { text } }) => {
        const newResults = Array.from(text.matchAll(/[0-9\- ]+/g))
          .map((res) => res[0].replace(/\D/g,''))
          .filter((res) => res.length === 22)
        setResults(newResults);
        setProgress(1);
      })
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
          <ul>{results.map((r: string) => <li key={r}>{r}</li>)}</ul>
        </div>}
      </div>}
    </div>
  );
}

export default App;
