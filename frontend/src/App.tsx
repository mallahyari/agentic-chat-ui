import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useAgent } from '@/hooks/useAgent';
import './App.css';

function App() {
	const { messages, isRunning, error, streamingText, sendMessage } = useAgent();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const hasMessages = messages.length > 0;

	return (
		<div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
			{/* Header */}
			{!hasMessages && (
				<div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
					<div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="text-xl font-semibold">
								<span className="text-gray-900">Agentic </span>
								<span className="text-teal-600">Chat UI</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Main Content */}
			<div className={`${hasMessages ? 'pt-0' : 'pt-16'}`}>
				{hasMessages ? (
					<div className="pb-50">
						{messages.map((message, index) => (
							<ChatMessage
								key={`${message.role}-${index}`}
								message={message}
								isFirst={index === 0}
								isStreaming={
									isRunning && index === messages.length - 1 && message.role === 'assistant'
								}
							/>
						))}
						<div ref={messagesEndRef} />
					</div>
				) : (
					<div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
						<div className="text-center">
							<div className="mb-8">
								<div className="text-4xl font-semibold mb-2">
									<span className="text-gray-900">Agentic </span>
									<span className="text-teal-600">Chat UI</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Error Display */}
			{error && (
				<div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md">
					<div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">
						<strong>Error:</strong> {error}
					</div>
				</div>
			)}

			{/* Input Area - Fixed at bottom */}
			<div
				className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pb-6 z-10 ${
					hasMessages ? 'pt-20' : 'pt-0'
				}`}
			>
				<ChatInput
					onSend={sendMessage}
					disabled={isRunning}
					hasMessages={hasMessages}
					streamingText={streamingText}
				/>
			</div>
		</div>
	);
}

export default App;
