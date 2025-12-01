import * as React from 'react';

interface TooltipProps {
    children: React.ReactElement;
    content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
        <div className="relative inline-block">
            {React.cloneElement(children as React.ReactElement<any>, {
                onMouseEnter: () => setIsVisible(true),
                onMouseLeave: () => setIsVisible(false),
            })}
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-50 pointer-events-none">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
}
