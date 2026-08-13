import type { FilterPreset, PhotoLayout, StripConfiguration, StripStyle } from '../types';

export const ROOM_PHASES = ['lobby', 'ready', 'countdown', 'review', 'complete', 'closed'] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];
export type ParticipantRole = 'creator' | 'guest';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface SharedBackground {
  mode: 'original' | 'removed' | 'preset' | 'uploaded';
  value?: string;
}

export interface SharedRoomConfig {
  layout: PhotoLayout;
  templateId: StripStyle;
  filterPreset: FilterPreset;
  background: SharedBackground;
}

export interface ParticipantSnapshot {
  id: string;
  name: string;
  role: ParticipantRole;
  ready: boolean;
  connection: ConnectionStatus;
}

export interface RoomSnapshot {
  code: string;
  revision: number;
  phase: RoomPhase;
  participants: ParticipantSnapshot[];
  shared: SharedRoomConfig;
  captureTargetAt?: number;
  captureControllerId?: string;
  acceptedFrameIds: string[];
  updatedBy?: string;
  expiresAt: number;
}

export interface RoomIdentity {
  participant: ParticipantSnapshot;
  reconnectToken: string;
}

export type RoomErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'FORBIDDEN'
  | 'STALE_REVISION'
  | 'INVALID_PHASE';

export interface RoomAck<T = undefined> {
  ok: boolean;
  data?: T;
  error?: { code: RoomErrorCode; message: string; snapshot?: RoomSnapshot };
}

export interface SignalPayload {
  kind: 'offer' | 'answer' | 'ice';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface ClientToServerEvents {
  'room:create': (payload: { name: string }, ack: (result: RoomAck<{ identity: RoomIdentity; snapshot: RoomSnapshot }>) => void) => void;
  'room:join': (payload: { code: string; name: string }, ack: (result: RoomAck<{ identity: RoomIdentity; snapshot: RoomSnapshot }>) => void) => void;
  'room:reconnect': (payload: { code: string; reconnectToken: string }, ack: (result: RoomAck<{ identity: RoomIdentity; snapshot: RoomSnapshot }>) => void) => void;
  'room:ready': (payload: { ready: boolean }, ack: (result: RoomAck<RoomSnapshot>) => void) => void;
  'room:update': (payload: { baseRevision: number; patch: Partial<SharedRoomConfig> }, ack: (result: RoomAck<RoomSnapshot>) => void) => void;
  'capture:start': (_payload: Record<string, never>, ack: (result: RoomAck<RoomSnapshot>) => void) => void;
  'capture:accept': (payload: { frameId: string }, ack: (result: RoomAck<RoomSnapshot>) => void) => void;
  'capture:retake': (payload: { index: number }, ack: (result: RoomAck<RoomSnapshot>) => void) => void;
  'room:finish': (_payload: Record<string, never>, ack: (result: RoomAck<RoomSnapshot>) => void) => void;
  'room:leave': () => void;
  'signal:send': (payload: SignalPayload) => void;
  'capture:publish': (payload: { index: number; dataUrl: string }) => void;
  'capture:remove': (payload: { index: number }) => void;
}

export interface ServerToClientEvents {
  'room:state': (snapshot: RoomSnapshot) => void;
  'room:error': (error: { code: RoomErrorCode; message: string }) => void;
  'signal:receive': (payload: SignalPayload) => void;
  'capture:frame': (payload: { index: number; dataUrl: string }) => void;
  'capture:removed': (payload: { index: number }) => void;
}

export interface RemoteBoothResult {
  photos: string[];
  config: StripConfiguration;
}

export function normalizeRoomCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
