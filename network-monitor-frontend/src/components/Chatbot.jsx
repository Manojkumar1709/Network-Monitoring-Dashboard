import React, { useState, useRef, useEffect } from 'react';

// Main Chatbot Component
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! How can I help you with your network monitoring today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Function to scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return;

    const newMessages = [...messages, { sender: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
      // --- Gemini API Call ---
      const prompt = `You are a helpful assistant for a network monitoring dashboard. The user is asking for help with a potential device error or a general question. The user's message is: "${userInput}". Provide a concise, helpful, and easy-to-understand response. If you suggest a command, wrap it in backticks.`;
      
      const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = ""; // API key is handled by the environment
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      let botResponse = 'Sorry, I had trouble understanding that. Please try rephrasing your question.';

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        botResponse = result.candidates[0].content.parts[0].text;
      }
      
      setMessages([...newMessages, { sender: 'bot', text: botResponse }]);
    } catch (error) {
      console.error("Error fetching from Gemini API:", error);
      setMessages([...newMessages, { sender: 'bot', text: 'There was an error connecting to the assistant. Please check the console for details.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Components ---

  // Chat Message Bubble
  const ChatMessage = ({ message }) => (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl shadow ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
        {/* Use dangerouslySetInnerHTML to render markdown-style code blocks */}
        <p className="text-sm" dangerouslySetInnerHTML={{ __html: message.text.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br />') }} />
      </div>
    </div>
  );

  // Main Chat Window
  const ChatWindow = () => (
    <div className="fixed bottom-24 right-8 w-80 md:w-96 h-[500px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl flex flex-col z-50 animate-fade-in-up">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Network Assistant</h3>
        <p className="text-xs text-gray-400">Powered by Gemini</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
        {isLoading && <ChatMessage message={{ sender: 'bot', text: '...' }} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 flex items-center">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask for help..."
          className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          className="ml-3 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Floating Action Button to toggle chatbot
  const ChatbotToggleButton = () => (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="fixed bottom-8 right-8 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 z-50"
      aria-label="Toggle Chatbot"
    >
      {isOpen ? (
        // Close Icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        // Chat Icon
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )}
    </button>
  );

  return (
    <>
      <ChatbotToggleButton />
      {isOpen && <ChatWindow />}
      {/* Basic styling for the component and animations */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
        code {
          background-color: rgba(0,0,0,0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #a7d1ff;
        }
      `}</style>
    </>
  );
}
