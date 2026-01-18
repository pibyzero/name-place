import { InputHTMLAttributes, FC } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input: FC<InputProps> = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-coral focus:outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}