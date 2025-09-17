import React, { useState } from 'react';

const GeminiAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      setResponse(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response');
    } catch (err) {
      setResponse('Error fetching response');
    }
    setLoading(false);
  };

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-lg font-bold mb-2">Gemini AI Assistant</h2>
      <form onSubmit={handleSubmit} className="mb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          className="border p-2 rounded w-full mb-2"
          placeholder="Ask Gemini..."
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
      {response && (
        <div className="bg-gray-100 p-2 rounded mt-2">
          <strong>Response:</strong>
          <div>{response}</div>
        </div>
      )}
    </div>
  );
};

export default GeminiAssistant;
