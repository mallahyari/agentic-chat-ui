import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, Image, Paperclip } from 'lucide-react';

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	hasMessages?: boolean;
	streamingText?: string | null;
}

export function ChatInput({
	onSend,
	disabled,
	hasMessages = false,
	streamingText,
}: ChatInputProps) {
	const [input, setInput] = useState('');
	const [isFocused, setIsFocused] = useState(false);

	const handleSend = () => {
		if (input.trim() && !disabled) {
			onSend(input.trim());
			setInput('');
		}
	};

	const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className={`w-full transition-all duration-300 ${hasMessages ? 'px-4 py-4' : 'px-4'}`}>
			<div
				className={`max-w-3xl mx-auto transition-all duration-300 ${
					hasMessages ? '' : 'mt-[35vh]'
				}`}
			>
				<div
					className={`relative bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-2 transition-all duration-300 ${
						isFocused
							? 'border-teal-500 shadow-2xl shadow-teal-500/20 scale-[1.01]'
							: 'border-gray-200/80 shadow-xl shadow-gray-200/50'
					}`}
				>
					<div className="flex items-center gap-3 px-5 py-4">
						<textarea
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyPress}
							onFocus={(e) => {
								if (disabled && streamingText) {
									e.target.blur();
								} else {
									setIsFocused(true);
								}
							}}
							onBlur={() => setIsFocused(false)}
							placeholder="Ask me anything..."
							disabled={disabled}
							className={`flex-1 bg-transparent border-none outline-none resize-none text-gray-900 placeholder:text-gray-400 text-base leading-7 min-h-[28px] max-h-[240px] ${disabled && streamingText ? 'caret-transparent pointer-events-none' : ''}`}
							rows={1}
							style={{
								height: 'auto',
								minHeight: '28px',
							}}
							onInput={(e) => {
								const target = e.target as HTMLTextAreaElement;
								target.style.height = 'auto';
								target.style.height = target.scrollHeight + 'px';
							}}
						/>

						<Button
							onClick={handleSend}
							disabled={disabled || !input.trim()}
							size="sm"
							className={`h-10 w-10 rounded-xl transition-all duration-200 ${
								disabled || !input.trim()
									? 'bg-gray-100 text-gray-400 cursor-not-allowed'
									: 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105'
							}`}
						>
							<ArrowUp className="h-5 w-5" strokeWidth={2.5} />
						</Button>
					</div>

					<div className="flex items-center justify-between px-5 pb-3 pt-1 border-t border-gray-100">
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								className="h-9 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 rounded-lg transition-colors"
							>
								<Paperclip className="h-4 w-4 mr-1.5" />
								<span className="text-sm font-medium">Attach</span>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-9 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 rounded-lg transition-colors"
							>
								<Image className="h-4 w-4 mr-1.5" />
								<span className="text-sm font-medium">Image</span>
							</Button>
						</div>

						<div className="text-xs text-gray-400">
							<kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-mono">Enter</kbd>
							<span className="mx-1.5">to send</span>
							<kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-mono">Shift + Enter</kbd>
							<span className="ml-1.5">for new line</span>
						</div>
					</div>
				</div>

				{!hasMessages && (
					<div className="text-center mt-6 space-y-3">
						<p className="text-sm text-gray-500 font-medium">
							Powered by advanced AI to provide comprehensive answers
						</p>
						<div className="flex items-center justify-center gap-4 text-xs text-gray-400">
							<span className="flex items-center gap-1.5">
								<div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
								Fast responses
							</span>
							<span className="flex items-center gap-1.5">
								<div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
								Context-aware
							</span>
							<span className="flex items-center gap-1.5">
								<div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
								Multi-modal
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
