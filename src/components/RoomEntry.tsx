import React, { useState } from 'react';
import { Link2, Plus, Users } from 'lucide-react';
import { normalizeRoomCode } from '../remote/types';

interface RoomEntryProps {
  onCreate: (name: string) => void;
  onJoin: (code: string, name: string) => void;
  busy: boolean;
  initialCode?: string;
  initialMode?: 'choose' | 'create' | 'join';
}

export const RoomEntry: React.FC<RoomEntryProps> = ({
  onCreate,
  onJoin,
  busy,
  initialCode = '',
  initialMode = 'choose'
}) => {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(initialCode ? 'join' : initialMode);
  const [name, setName] = useState('');
  const [code, setCode] = useState(normalizeRoomCode(initialCode));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#FFF5F5] to-[#FFFDF8] border border-[#FF6B6B]/20 p-5 text-center">
        <div className="mx-auto w-11 h-11 rounded-2xl bg-[#FF6B6B] text-white flex items-center justify-center shadow-md">
          <Users className="w-5 h-5" />
        </div>
        <h4 className="mt-3 text-lg font-black text-[#2D2D2D]">Long-Distance Booth</h4>
        <p className="mt-1 text-xs leading-relaxed text-[#666666]">
          Take four photos together from different places. Your cameras stay peer-to-peer.
        </p>
      </div>

      <label className="block text-xs font-bold text-[#2D2D2D]">
        Your name
        <input
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 32))}
          placeholder="Maya"
          className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[#D8D5CE] bg-white outline-none focus:ring-2 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B]"
        />
      </label>

      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('create')}
            className="p-4 rounded-2xl border border-[#E8E6DF] bg-white hover:border-[#FF6B6B] hover:bg-[#FFF8F8] text-left transition-colors"
          >
            <Plus className="w-5 h-5 text-[#FF6B6B]" />
            <span className="mt-2 block text-sm font-black">Create a room</span>
            <span className="mt-1 block text-[11px] text-[#777]">Get a shareable code</span>
          </button>
          <button
            onClick={() => setMode('join')}
            className="p-4 rounded-2xl border border-[#E8E6DF] bg-white hover:border-[#4ECDC4] hover:bg-[#F4FFFD] text-left transition-colors"
          >
            <Link2 className="w-5 h-5 text-[#25AFA5]" />
            <span className="mt-2 block text-sm font-black">Join a room</span>
            <span className="mt-1 block text-[11px] text-[#777]">Enter their six-letter code</span>
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex gap-2">
          <button onClick={() => setMode('choose')} className="px-4 py-2.5 rounded-xl border border-[#E8E6DF] text-xs font-bold">
            Back
          </button>
          <button
            onClick={() => onCreate(name.trim())}
            disabled={busy || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#FF6B6B] text-white text-xs font-black disabled:opacity-40"
          >
            {busy ? 'Creating…' : 'Create room code'}
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#2D2D2D]">
            Room code
            <input
              value={code}
              onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
              placeholder="ABC234"
              inputMode="text"
              autoCapitalize="characters"
              className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-[#D8D5CE] bg-white text-center font-mono text-xl tracking-[0.3em] uppercase outline-none focus:ring-2 focus:ring-[#4ECDC4]/30 focus:border-[#4ECDC4]"
            />
          </label>
          <div className="flex gap-2">
            {!initialCode && (
              <button onClick={() => setMode('choose')} className="px-4 py-2.5 rounded-xl border border-[#E8E6DF] text-xs font-bold">
                Back
              </button>
            )}
            <button
              onClick={() => onJoin(normalizeRoomCode(code), name.trim())}
              disabled={busy || !name.trim() || normalizeRoomCode(code).length !== 6}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#2D2D2D] text-white text-xs font-black disabled:opacity-40"
            >
              {busy ? 'Joining…' : 'Join room'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
