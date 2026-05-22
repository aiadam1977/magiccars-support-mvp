'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function UploadPage() {
  const { session_id } = useParams() as { session_id: string }

  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error' | 'already_uploaded'
  >('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    // Attempt to load session info for display (best effort)
    fetch(`/api/analyze/${session_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'complete' || d.status === 'uploaded') {
          setStatus('already_uploaded')
        }
      })
      .catch(() => {})
  }, [session_id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (note) formData.append('note', note)

      const res = await fetch(`/api/upload/${session_id}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const isImage = file?.type.startsWith('image/')
  const isVideo = file?.type.startsWith('video/')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#E31837] text-white py-4 px-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center font-bold text-[#E31837] text-xs">
            MC
          </div>
          <div>
            <div className="font-bold text-base leading-tight">MagicCars Support</div>
            <div className="text-xs text-white/70">Magic Cars 12V 2WD Ride-On Jeep</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">

        {/* Safety Warning — always shown */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg mt-0.5">⚠</span>
            <p className="text-sm text-amber-800 font-medium leading-snug">
              <strong>Safety first.</strong> Make sure your child is not in or near the vehicle
              before recording. Do not operate the vehicle while filming if it poses any risk.
            </p>
          </div>
        </div>

        {status === 'already_uploaded' && (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Already Uploaded</h2>
            <p className="text-slate-500 text-sm">
              Your media was received. The MagicCars support agent is reviewing it and will share
              the results on the call.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Received — Thank You</h2>
            <p className="text-slate-600 text-sm mb-4">
              We have your photo or video and are running a visual check right now.
            </p>
            <p className="text-slate-500 text-xs">
              Stay on the call — the agent will share what they find with you shortly.
            </p>
          </div>
        )}

        {(status === 'idle' || status === 'uploading' || status === 'error') && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="card">
              <h1 className="text-lg font-bold text-[#E31837] mb-1">
                Send a Photo or Video to MagicCars Support
              </h1>
              <p className="text-sm text-slate-500 mb-4">
                Upload a photo or short video of the issue. The agent will review it while you stay
                on the call.
              </p>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragOver
                    ? 'border-[#E31837] bg-[#FFF0F2]'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDragOver={e => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {file ? (
                  <div>
                    {isImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg mb-3 object-contain"
                      />
                    )}
                    {isVideo && (
                      <video
                        src={URL.createObjectURL(file)}
                        className="max-h-48 mx-auto rounded-lg mb-3"
                        controls
                      />
                    )}
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      Tap to select a photo or video
                    </p>
                    <p className="text-xs text-slate-400">Or drag and drop here</p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG, MP4, MOV up to 100MB
                    </p>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="card">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Add a note (optional)
              </label>
              <textarea
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E31837]"
                placeholder="e.g. Only makes the noise on grass, not on hard floors"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {status === 'error' && errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full btn-primary py-3 text-base"
              disabled={!file || status === 'uploading'}
            >
              {status === 'uploading' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send to MagicCars Support'
              )}
            </button>

            <p className="text-xs text-center text-slate-400">
              Your media is used only for this support call and stored securely.
            </p>
          </form>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-slate-400">
        MagicCars Support MVP &mdash; Demo Only
      </footer>
    </div>
  )
}
