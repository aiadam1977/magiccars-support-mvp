'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const MAX_FILES = 5
const MAX_MB    = 100

type PageStatus = 'loading' | 'ready' | 'uploading' | 'success' | 'error' | 'already_uploaded'

interface UploadedInfo {
  caller_name?: string
  vehicle?: string
  file_count?: number
}

interface FileEntry {
  file: File
  preview: string  // object URL
  id: string
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {[
        { n: 1, label: 'Add photos' },
        { n: 2, label: 'Send' },
      ].map(({ n, label }, i) => (
        <div key={n} className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              n <= current ? 'bg-[#E31837] text-white' : 'bg-slate-200 text-slate-400'
            }`}>
              {n < current ? '✓' : n}
            </div>
            <span className={`text-xs font-medium ${n <= current ? 'text-slate-700' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
          {i === 0 && <div className="w-8 h-px bg-slate-200" />}
        </div>
      ))}
    </div>
  )
}

// ─── Thumbnail grid ───────────────────────────────────────────────────────────

function Thumbnail({ entry, onRemove }: { entry: FileEntry; onRemove: () => void }) {
  const isVideo = entry.file.type.startsWith('video/')
  return (
    <div className="relative group rounded-xl overflow-hidden bg-slate-100 aspect-square">
      {isVideo ? (
        <video src={entry.preview} className="w-full h-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.preview} alt={entry.file.name} className="w-full h-full object-cover" />
      )}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        title="Remove"
      >
        ×
      </button>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-1.5">
        <p className="text-white text-[10px] truncate">{entry.file.name}</p>
      </div>
    </div>
  )
}

// ─── Upload progress bar ──────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 bg-[#E31837] rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { session_id } = useParams() as { session_id: string }

  const [status, setStatus]           = useState<PageStatus>('loading')
  const [entries, setEntries]         = useState<FileEntry[]>([])
  const [note, setNote]               = useState('')
  const [step, setStep]               = useState<1 | 2>(1)
  const [progress, setProgress]       = useState(0)
  const [errorMsg, setErrorMsg]       = useState('')
  const [uploadedInfo, setUploadedInfo] = useState<UploadedInfo>({})
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const cameraInputRef                = useRef<HTMLInputElement>(null)

  // Check if already uploaded
  useEffect(() => {
    fetch(`/api/analyze/${session_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'complete' || d.status === 'uploaded' || d.status === 'analyzing') {
          setStatus('already_uploaded')
        } else {
          setStatus('ready')
        }
      })
      .catch(() => setStatus('ready'))
  }, [session_id])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => { entries.forEach(e => URL.revokeObjectURL(e.preview)) }
  }, [entries])

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles)
    const remaining = MAX_FILES - entries.length
    if (remaining <= 0) return

    const valid = arr.slice(0, remaining).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    )

    setEntries(prev => [
      ...prev,
      ...valid.map(f => ({
        file:    f,
        preview: URL.createObjectURL(f),
        id:      `${Date.now()}-${Math.random()}`,
      })),
    ])
  }

  function removeEntry(id: string) {
    setEntries(prev => {
      const entry = prev.find(e => e.id === id)
      if (entry) URL.revokeObjectURL(entry.preview)
      return prev.filter(e => e.id !== id)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (entries.length === 0) return

    setStatus('uploading')
    setErrorMsg('')
    setProgress(10)

    try {
      const formData = new FormData()
      entries.forEach(e => formData.append('file', e.file))
      if (note.trim()) formData.append('note', note.trim())

      // Fake progress while upload + analysis runs
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 5, 85))
      }, 800)

      const res  = await fetch(`/api/upload/${session_id}`, { method: 'POST', body: formData })
      const data = await res.json()

      clearInterval(progressInterval)
      setProgress(100)

      if (data.success) {
        setUploadedInfo({
          caller_name: data.caller_name,
          vehicle:     data.vehicle,
          file_count:  data.file_count,
        })
        setTimeout(() => setStatus('success'), 400)
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('error')
      setProgress(0)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E31837]/30 border-t-[#E31837] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#E31837] text-white py-4 px-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center font-bold text-[#E31837] text-xs flex-shrink-0">
            MC
          </div>
          <div>
            <div className="font-bold text-base leading-tight">MagicCars Support</div>
            <div className="text-xs text-white/70">Visual Diagnostic Upload</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">

        {/* ── Already uploaded ─────────────────────────────────────────────── */}
        {status === 'already_uploaded' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Already Received</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your photos have been received and our team is reviewing them. Stay on the call — the agent will share what they find shortly.
            </p>
          </div>
        )}

        {/* ── Success ──────────────────────────────────────────────────────── */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {uploadedInfo.caller_name && uploadedInfo.caller_name !== 'Unknown Caller' && (
              <p className="text-lg font-bold text-slate-800 mb-1">
                Thank you, {uploadedInfo.caller_name.split(' ')[0]}!
              </p>
            )}

            <h2 className="text-base font-semibold text-green-700 mb-3">
              {uploadedInfo.file_count ?? 1} photo{(uploadedInfo.file_count ?? 1) !== 1 ? 's' : ''} received
            </h2>

            {uploadedInfo.vehicle && (
              <p className="text-sm text-slate-500 mb-1">Vehicle: {uploadedInfo.vehicle}</p>
            )}

            <p className="text-slate-600 text-sm leading-relaxed mb-5 max-w-xs mx-auto">
              Our support specialist is running a visual analysis right now. Stay on the call — they will walk you through what they find.
            </p>

            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-0.5">Session reference</p>
              <p className="font-mono text-sm font-semibold text-slate-700">{session_id}</p>
            </div>
          </div>
        )}

        {/* ── Upload form ───────────────────────────────────────────────────── */}
        {(status === 'ready' || status === 'uploading' || status === 'error') && (
          <>
            {/* Safety warning */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-5 flex items-start gap-2.5">
              <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-sm text-amber-800 leading-snug">
                <strong>Safety first.</strong> Make sure your child is not in or near the vehicle before uploading. Do not operate the vehicle while filming.
              </p>
            </div>

            {/* Steps */}
            <Steps current={step} />

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Step 1: Photo selection ─────────────────────────────────── */}
              {step === 1 && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h1 className="text-base font-bold text-slate-800 mb-1">
                      Add photos or a video
                    </h1>
                    <p className="text-xs text-slate-500 mb-4">
                      Take clear photos of the issue area from a few different angles. You can add up to {MAX_FILES} photos or videos.
                    </p>

                    {/* Thumbnail grid */}
                    {entries.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {entries.map(entry => (
                          <Thumbnail key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} />
                        ))}
                        {entries.length < MAX_FILES && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-[#E31837] hover:text-[#E31837] transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span className="text-[10px] font-medium">Add more</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Drop zone — only shown when no files yet */}
                    {entries.length === 0 && (
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                          dragOver ? 'border-[#E31837] bg-red-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                      >
                        <div className="text-4xl mb-3">📷</div>
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          Tap to select photos or a video
                        </p>
                        <p className="text-xs text-slate-400">Up to {MAX_FILES} files · {MAX_MB} MB each · JPG, PNG, MP4, MOV</p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className={`flex gap-2 ${entries.length > 0 ? 'mt-0' : 'mt-4'}`}>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-[#E31837] hover:text-[#E31837] transition-colors bg-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Take photo
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-[#E31837] hover:text-[#E31837] transition-colors bg-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Choose file
                      </button>
                    </div>

                    {/* File count indicator */}
                    {entries.length > 0 && (
                      <p className="text-xs text-center text-slate-400 mt-3">
                        {entries.length} of {MAX_FILES} photos selected
                        {entries.length < MAX_FILES && ` · ${MAX_FILES - entries.length} more allowed`}
                      </p>
                    )}

                    {/* Hidden inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
                    />
                  </div>

                  {/* Tips */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Tips for a great photo</p>
                    <ul className="space-y-1">
                      {[
                        'Hold the phone steady and close to the issue area',
                        'Good lighting helps — step outside or near a window',
                        'If it makes a noise, a short video works best',
                        'Include multiple angles if the issue is hard to see',
                      ].map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-blue-700">
                          <span className="flex-shrink-0 mt-0.5">•</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={entries.length === 0}
                    className="w-full bg-[#E31837] text-white font-semibold rounded-xl py-3 text-sm hover:bg-[#c41530] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue →
                  </button>
                </>
              )}

              {/* ── Step 2: Note + send ─────────────────────────────────────── */}
              {step === 2 && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-slate-800">Ready to send</h2>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {entries.length} photo{entries.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Thumbnail strip */}
                    <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                      {entries.map(entry => (
                        <div key={entry.id} className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                          {entry.file.type.startsWith('video/') ? (
                            <video src={entry.preview} className="w-full h-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.preview} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-14 h-14 flex-shrink-0 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 text-xs text-center leading-tight"
                      >
                        Edit
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Add a note (optional)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]/30 focus:border-[#E31837] resize-none"
                        placeholder="e.g. Only makes the noise on grass, not on hard floors. Started 3 days ago."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        disabled={status === 'uploading'}
                      />
                    </div>
                  </div>

                  {/* Upload progress */}
                  {status === 'uploading' && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-5 h-5 border-2 border-[#E31837]/30 border-t-[#E31837] rounded-full animate-spin flex-shrink-0" />
                        <p className="text-sm font-medium text-slate-700">
                          {progress < 50 ? `Uploading ${entries.length} photo${entries.length !== 1 ? 's' : ''}…` : 'Running visual analysis…'}
                        </p>
                      </div>
                      <ProgressBar pct={progress} />
                      <p className="text-xs text-slate-400 mt-2 text-center">
                        This usually takes 15–30 seconds
                      </p>
                    </div>
                  )}

                  {status === 'error' && errorMsg && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={entries.length === 0 || status === 'uploading'}
                    className="w-full bg-[#E31837] text-white font-semibold rounded-xl py-3 text-sm hover:bg-[#c41530] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'uploading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      `Send ${entries.length} Photo${entries.length !== 1 ? 's' : ''} to MagicCars Support`
                    )}
                  </button>

                  {status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => { setStep(1); setStatus('ready'); setErrorMsg('') }}
                      className="w-full text-slate-400 text-sm py-2 hover:text-slate-600"
                    >
                      ← Back
                    </button>
                  )}
                </>
              )}
            </form>

            <p className="text-xs text-center text-slate-400 mt-4">
              Your photos are used only for this support call and stored securely.
            </p>
          </>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-slate-400">
        MagicCars Support
      </footer>
    </div>
  )
}
