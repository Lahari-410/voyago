'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { useAuth } from '../../../lib/AuthContext';
import { Room, Message } from '../../../types';

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const { user } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [issue, setIssue] = useState('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'cab' | 'issues'>('chat');
  const [cabAmount, setCabAmount] = useState('');
  const [cabDestination, setCabDestination] = useState('');
  const [cabParticipants, setCabParticipants] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadRoom = async () => {
      try {
       const res = await api.rooms.get(roomId);
        setRoom(res.data.room);
        setMessages(res.data.room.messages || []);
      } catch (err) {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadRoom();

    const socket = getSocket();
    if (!socket) return;

    socket.emit('join-room', roomId);

    socket.on('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('room-history', (data: { messages: Message[] }) => {
      setMessages(data.messages);
    });
    socket.on('issue-reported', (data: { message: Message }) => {
      setMessages((prev) => [...prev, data.message]);
    });
    socket.on('user-typing', (data: { userName: string }) => {
      setIsTyping(data.userName);
    });
    socket.on('user-stop-typing', () => setIsTyping(null));
    socket.on('room-closed', (data: { message: string }) => {
      alert(data.message);
      router.push('/dashboard');
    });

    return () => {
      socket.off('new-message');
      socket.off('room-history');
      socket.off('issue-reported');
      socket.off('user-typing');
      socket.off('user-stop-typing');
      socket.off('room-closed');
    };
  }, [roomId, router]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('send-message', { roomId, text: newMessage.trim() });
    setNewMessage('');
    socket.emit('stop-typing', roomId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  let typingTimeout: ReturnType<typeof setTimeout>;
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing', roomId);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('stop-typing', roomId), 1500);
  };

  const reportIssue = () => {
    if (!issue.trim()) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('report-issue', { roomId, issue: issue.trim() });
    setIssue('');
    setShowIssueForm(false);
  };

  const createCabSplit = async () => {
    if (!cabAmount || !cabDestination) return;
    try {
      await api.rooms.createCabSplit(roomId, {
  totalAmount: parseFloat(cabAmount),
  destination: cabDestination,
  participantIds: cabParticipants,
});
      setCabAmount(''); setCabDestination(''); setCabParticipants([]);
      alert('Cab split created! Co-passengers can now pay their share.');
    } catch { alert('Failed to create cab split'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading journey room...</p>
    </div>
  );
  if (!room) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 text-xl">←</button>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-800">{room.from} → {room.to}</h2>
          <p className="text-xs text-gray-400">
            PNR: {room.pnr} · {room.participants.length} passengers ·{' '}
            <span className={room.status === 'active' ? 'text-green-500' : 'text-gray-400'}>{room.status}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex">
        {(['chat', 'cab', 'issues'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab === 'chat' ? '💬 Chat' : tab === 'cab' ? '🚗 Cab Split' : '🚨 Issues'}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {messages.map((msg, i) => {
              const isMe = msg.userId === user?.id;
              const isSystem = msg.type === 'system' || msg.type === 'issue';
              if (isSystem) return (
                <div key={i} className="text-center">
                  <span className={`text-xs px-3 py-1 rounded-full ${msg.type === 'issue' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    {msg.text}
                  </span>
                </div>
              );
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && <span className="text-xs text-gray-400 mb-1 px-1">{msg.userName}</span>}
                    <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                    <span className="text-xs text-gray-300 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            {isTyping && <div className="text-xs text-gray-400 italic">{isTyping} is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {showIssueForm && (
            <div className="bg-red-50 border-t border-red-100 p-3 flex gap-2">
              <input value={issue} onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the issue (e.g. AC not working in S3)"
                className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none bg-white" />
              <button onClick={reportIssue} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Report</button>
              <button onClick={() => setShowIssueForm(false)} className="px-3 py-2 text-gray-500 text-sm">✕</button>
            </div>
          )}

          <div className="bg-white border-t border-gray-200 p-3 flex gap-2 items-center">
            <button onClick={() => setShowIssueForm(!showIssueForm)} className="text-red-400 hover:text-red-600 text-lg px-1" title="Report issue">🚨</button>
            <input value={newMessage} onChange={handleTyping} onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={sendMessage} disabled={!newMessage.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 disabled:opacity-40 transition-colors">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Cab Split Tab */}
      {activeTab === 'cab' && (
        <div className="flex-1 p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Split a Cab Fare</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Fare (₹)</label>
                <input value={cabAmount} onChange={(e) => setCabAmount(e.target.value)} type="number" placeholder="500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input value={cabDestination} onChange={(e) => setCabDestination(e.target.value)} placeholder="e.g. Bandra, Mumbai"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select co-passengers to split with:</label>
                <div className="space-y-2">
                  {room.participants.filter((p) => p.id !== user?.id).map((p) => (
                    <label key={p.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={cabParticipants.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setCabParticipants([...cabParticipants, p.id]);
                          else setCabParticipants(cabParticipants.filter((id) => id !== p.id));
                        }} className="rounded" />
                      <span className="text-sm text-gray-700">{p.name}</span>
                      {cabAmount && (
                        <span className="text-xs text-gray-400">₹{Math.ceil(parseFloat(cabAmount) / (cabParticipants.length + 2))} each</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={createCabSplit} disabled={!cabAmount || !cabDestination}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                Create Cab Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="flex-1 p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Reported Issues</h3>
            {room.issues.length === 0
              ? <p className="text-gray-400 text-sm">No issues reported yet. Hopefully your journey is smooth!</p>
              : <ul className="space-y-2">{room.issues.map((iss, i) => (
                  <li key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                    <span className="text-red-500 mt-0.5">🚨</span>
                    <span className="text-sm text-red-700">{iss}</span>
                  </li>
                ))}</ul>}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Report a new issue:</p>
              <div className="flex gap-2">
                <input value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. No water in washroom"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                <button onClick={reportIssue} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Report</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
