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
        className={`w-full px-4 py-2 rounded-lg border border-gray-300 bg-white bg-opacity-80 focus:border-coral focus:bg-white focus:outline-none transition-all ${className}`}
        {...props}
      />
    </div>
  )
}