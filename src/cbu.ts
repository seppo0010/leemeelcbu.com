import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.15.349/pdf.worker.js'

export function findCBUsInText (text: string): string[] {
  return Array.from(text.matchAll(/[0-9\- ]+/g))
    .map((res) => res[0].replace(/\D/g, ''))
    .filter((res) => res.length === 22)
}

export async function readImage (f: File): Promise<string[]> {
  if (f.type.split('/')[0] !== 'image') return []
  return await Tesseract.recognize(
    f,
    'spa'
  ).then(({ data: { text } }) => findCBUsInText(text))
}

export async function readPDF (f: File): Promise<string[]> {
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

export async function readFile (file: File): Promise<string[]> {
  return (await Promise.all([
    readImage(file),
    readPDF(file)
  ])).flat()
}

export function fileListToFileArray (f?: FileList): File[] {
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
