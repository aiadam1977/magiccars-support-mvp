'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CallsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/cases') }, [router])
  return null
}
