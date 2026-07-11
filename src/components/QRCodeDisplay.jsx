import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRCodeDisplay({ asset }) {
  const canvasWrapRef = useRef(null)
  // Use NEXT_PUBLIC-like runtime URL so deployed builds work from any subpath.
  // If not set, fall back to the current origin (works for local dev).
  // Normalize to avoid double slashes when env var ends with '/'
  const publicBaseUrl = (import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin).replace(/\/+$/, '')
  const publicUrl = `${publicBaseUrl}/asset/${asset.asset_code}`


  function downloadPng() {
    const canvas = canvasWrapRef.current.querySelector('canvas')
    const link = document.createElement('a')
    link.download = `${asset.asset_code}-qr.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl)
  }

  function printLabel() {
    const canvas = canvasWrapRef.current.querySelector('canvas')
    const dataUrl = canvas.toDataURL('image/png')
    const win = window.open('', '_blank', 'width=420,height=560')
    win.document.write(`
      <html>
        <head><title>${asset.asset_code} — Asset Label</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 24px; text-align: center; }
          h2 { margin-bottom: 4px; }
          .code { font-size: 20px; letter-spacing: 2px; font-weight: bold; margin: 8px 0; }
          .meta { font-size: 13px; color: #333; margin: 2px 0; }
          .instr { margin-top: 14px; font-size: 12px; color: #555; }
          .border { border: 2px solid #000; padding: 16px; border-radius: 6px; display: inline-block; }
        </style>
        </head>
        <body onload="window.print()">
          <div class="border">
            <div class="meta">MaintainIQ Asset Label</div>
            <h2>${asset.name}</h2>
            <div class="code">${asset.asset_code}</div>
            <div class="meta">${asset.location}</div>
            <img src="${dataUrl}" width="180" height="180" />
            <div class="instr">Scan this code to report an issue<br/>or view service history.</div>
          </div>
        </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="asset-tag flex flex-col items-center gap-3 p-5">
      <div ref={canvasWrapRef} className="rounded bg-white p-3">
        <QRCodeCanvas value={publicUrl} size={168} level="M" includeMargin={false} />
      </div>
      <p className="font-mono text-xs text-muted break-all text-center">{publicUrl}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={downloadPng} className="rounded-tag border border-graphite-600 px-3 py-1.5 text-xs hover:border-safety hover:text-safety transition">
          Download PNG
        </button>
        <button onClick={copyLink} className="rounded-tag border border-graphite-600 px-3 py-1.5 text-xs hover:border-safety hover:text-safety transition">
          Copy link
        </button>
        <button onClick={printLabel} className="rounded-tag border border-graphite-600 px-3 py-1.5 text-xs hover:border-safety hover:text-safety transition">
          Print label
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-tag bg-safety px-3 py-1.5 text-xs font-semibold text-graphite-950 hover:brightness-95 transition"
        >
          Open public page
        </a>
      </div>
    </div>
  )
}
