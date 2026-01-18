import { FC } from 'react'

interface TimerProps {
  seconds: number
  isWarning?: boolean
}

export const Timer: FC<TimerProps> = ({ seconds }) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const isWarning = seconds <= 10

  return (
    <div className={`text-4xl font-bold font-heading ${isWarning ? 'text-red-500 animate-pulse' : 'text-charcoal'}`}>
      {minutes.toString().padStart(2, '0')}:{remainingSeconds.toString().padStart(2, '0')}
    </div>
  )
}