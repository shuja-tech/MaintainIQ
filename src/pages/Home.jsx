import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  function goToAsset(e) {
    e.preventDefault()
    if (code.trim()) navigate(`/asset/${code.trim().toUpperCase()}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-15 sm:px-7">
      <div className="relative">
        {/* Hero accent halo */}
        <br>
          </br><br>
          </br>
          <br></br>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-8 -top-10 -z-10 opacity-70"
          style={{
            background:
              'url(/src/images/image_503c9e43.png), radial-gradient(closest-side at 30% 20%, rgba(255,201,60,0.18), transparent 65%), radial-gradient(closest-side at 70% 10%, rgba(45,212,191,0.12), transparent 55%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="motion-in" style={{ animationDelay: '20ms' }}>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-safety">
            Scan. Report. Diagnose. Maintain.
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Every asset gets a digital identity and a permanent service history.
          </h1>
          <p className="mt-4 max-w-xl text-muted leading-relaxed">
            MaintainIQ turns a scattered mess of registers, phone calls, and spreadsheets into one
            traceable workflow: scan a QR tag, report the issue, let AI triage it, and track it
            through resolution.
          </p>

          {/* Micro outcomes */}
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { n: '1', t: 'Scan' },
              { n: '2', t: 'Report' },
              { n: '3', t: 'Resolve' },
            ].map((item) => (
              <div key={item.t} className="asset-tag px-4 py-2 hover-lift">
                <p className="font-mono text-xs text-safety">{item.n}</p>
                <p className="mt-0.5 text-sm font-semibold">{item.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
<br>
          </br><br>
          </br><br>
          </br><br>
          </br><br>
          </br>
          <br>
          </br><br>
          </br><br>
          </br><br>
          </br><br>
          </br><br>
          </br>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="asset-tag p-6 hover-lift motion-in" style={{ animationDelay: '40ms' }}>
          <p className="font-mono text-xs uppercase text-muted">Have an asset tag?</p>

          <h2 className="mt-1 text-lg font-semibold">Look up an asset</h2>
          <form onSubmit={goToAsset} className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. AST-000123"
              className="w-full rounded-tag border border-graphite-600 bg-graphite-800 px-3 py-2 text-sm font-mono outline-none focus:border-safety"
            />
            <button className="rounded-tag bg-safety px-4 py-2 text-sm font-semibold text-graphite-950 hover:brightness-95 transition">
              Go
            </button>
          </form>
        </div>

        <div className="asset-tag p-6 hover-lift motion-in" style={{ animationDelay: '120ms' }}>
          <p className="font-mono text-xs uppercase text-muted">Team member?</p>
          <h2 className="mt-1 text-lg font-semibold">Manage assets & issues</h2>
          <p className="mt-2 text-sm text-muted">
            Sign in to register assets, generate QR labels, triage issues with AI, and assign work
            to technicians.
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-tag border border-graphite-600 px-4 py-2 text-sm hover:border-safety hover:text-safety transition"
          >
            Staff sign in →
          </a>
        </div>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          [
            '01',
            'Register',
            'Create a digital record and a unique asset code for every piece of equipment.',
          ],
          [
            '02',
            'Report',
            'Anyone can scan the QR tag and describe the problem — no login required.',
          ],
          [
            '03',
            'Resolve',
            'AI triage suggests a diagnosis; technicians close the loop with a service record.',
          ],
        ].map(([n, title, body], idx) => (
          
          <div
          
            key={n}
            className="rounded-tag border border-graphite-700 p-5 hover-lift motion-in"
            style={{ animationDelay: `${160 + idx * 60}ms` }}
          >
            <p className="font-mono text-xs text-safety">{n}</p>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
        <br>
          </br><br>
          </br><br>
          </br><br>
          </br>
      </div>
    </div>
  )
}

