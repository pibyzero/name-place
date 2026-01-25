import { FC, ReactNode } from 'react'

interface GameLayoutProps {
    children: ReactNode
    header?: ReactNode
    maxWidth?: 'sm' | 'md' | 'lg'
    centerVertically?: boolean
}

const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
}

export const GameLayout: FC<GameLayoutProps> = ({
    children,
    header,
    maxWidth = 'md',
    centerVertically = false,
}) => {
    return (
        <div className="min-h-screen p-4 md:p-6 pt-14 md:pt-16">
            {header && (
                <div className={`${maxWidthClasses[maxWidth]} mx-auto mb-6`}>
                    {header}
                </div>
            )}
            <div className={`${maxWidthClasses[maxWidth]} mx-auto ${centerVertically ? 'flex items-center min-h-[calc(100vh-6rem)]' : ''}`}>
                {children}
            </div>
        </div>
    )
}
