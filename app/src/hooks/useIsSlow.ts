import { useEffect, useState } from 'react'

// True once something has been loading for more than 2 seconds
export function useIsSlow(loading: boolean) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setSlow(true), 2000)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [loading])

  return slow
}
