import { useEffect } from 'react'

const APP_NAME = 'Mini Apartment'

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`
  }, [title])
}
