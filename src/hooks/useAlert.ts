import { useState } from 'react'

interface AlertOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
}

export function useAlert() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    options: AlertOptions | null
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: null,
    resolve: null
  })

  const showAlert = (options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve
      })
    })
  }

  const handleConfirm = () => {
    if (alertState.resolve) {
      alertState.resolve(true)
    }
    setAlertState({ isOpen: false, options: null, resolve: null })
  }

  const handleCancel = () => {
    if (alertState.resolve) {
      alertState.resolve(false)
    }
    setAlertState({ isOpen: false, options: null, resolve: null })
  }

  return { 
    showAlert, 
    alertState,
    handleConfirm,
    handleCancel 
  }
}
