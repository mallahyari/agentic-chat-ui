import type { Message } from '@ag-ui/client';
import { Sparkles, Globe, List, FileText, Terminal, ChevronDown } from 'lucide-react';
import { TextShimmer } from '@/components/ui/text-shimmer';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    isFirst?: boolean;
}

export function ChatMessage({ message, isStreaming, isFirst }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const [isStepsExpanded, setIsStepsExpanded] = useState(true);

    // Render user message
    if (isUser) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex">
                    <div className="bg-gray-50 rounded-xl px-5 py-3 border border-gray-100 max-w-[85%]">
                        <p className="text-gray-900 text-[15px]">
                            {typeof message.content === 'string'
                                ? message.content
                                : Array.isArray(message.content)
                                    ? message.content
                                        .filter((item: any) => item.type === 'text')
                                        .map((item: any) => item.text)
                                        .join('')
                                    : ''}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render assistant response
    if (isAssistant) {
        const content =
            typeof message.content === 'string'
                ? message.content
                : Array.isArray(message.content)
                    ? message.content
                        .filter((item: any) => item.type === 'text')
                        .map((item: any) => item.text)
                        .join('')
                    : '';

        return (
            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Steps Timeline */}
                {(message as any).steps && (message as any).steps.length > 0 && (
                    <div className="mb-8">
                        <div
                            className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80"
                            onClick={() => setIsStepsExpanded(!isStepsExpanded)}
                        >
                            <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                            <span className="text-sm font-medium text-gray-900">
                                {isStepsExpanded ? 'Hide steps' : `View ${(message as any).steps.length} steps`}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isStepsExpanded ? 'rotate-180' : ''}`} />
                        </div>

                        {isStepsExpanded && (
                            <div className="relative ml-1 mt-2">
                                {(message as any).steps.map((step: any, idx: number) => {
                                    // Determine icon based on step name
                                    let Icon = List;

                                    if (step.name.toLowerCase().includes('search')) {
                                        Icon = Globe;
                                    } else if (step.name.toLowerCase().includes('plan')) {
                                        Icon = List;
                                    } else if (step.name.toLowerCase().includes('read') || step.name.toLowerCase().includes('content')) {
                                        Icon = FileText;
                                    }

                                    const isLast = idx === (message as any).steps.length - 1;

                                    return (
                                        <div key={idx} className="relative pl-8 pb-6 last:pb-2">
                                            {/* Animated vertical line segment for this step */}
                                            {!isLast && (
                                                <div
                                                    className="absolute left-[11px] top-6 w-[2px] bg-gray-300 overflow-hidden"
                                                    style={{
                                                        height: 'calc(100% - 6px)',
                                                        animation: 'expandHeight 0.4s ease-out forwards',
                                                        animationDelay: `${idx * 0.2}s`,
                                                        maxHeight: 0
                                                    }}
                                                />
                                            )}

                                            {/* Step Icon on the line */}
                                            <div
                                                className="absolute left-0 top-0 bg-white p-1 z-10"
                                                style={{
                                                    animation: 'fadeIn 0.3s ease-out forwards',
                                                    animationDelay: `${idx * 0.15}s`,
                                                    opacity: 0
                                                }}
                                            >
                                                <Icon className="h-4 w-4 text-gray-400" />
                                            </div>

                                            {/* Step Content */}
                                            <div
                                                className="space-y-1 pt-0.5 text-left"
                                                style={{
                                                    animation: 'fadeIn 0.3s ease-out forwards',
                                                    animationDelay: `${idx * 0.15}s`,
                                                    opacity: 0
                                                }}
                                            >
                                                <div className="text-[15px] font-medium text-gray-700 leading-tight">
                                                    {step.status === 'running' ? (
                                                        <TextShimmer
                                                            duration={1.5}
                                                            className="font-medium"
                                                        >
                                                            {step.name}
                                                        </TextShimmer>
                                                    ) : (
                                                        step.name
                                                    )}
                                                </div>
                                                {step.text && (
                                                    <div className="text-[14px] text-gray-500 leading-relaxed italic">
                                                        {step.text}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}



                {/* Answer section */}
                <div className="prose prose-gray max-w-none text-left">
                    <div className={`text-gray-800 text-[15px] leading-7 ${isStreaming ? 'streaming-content' : ''}`}>
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
