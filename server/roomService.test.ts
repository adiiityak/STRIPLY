import { describe, expect, it } from 'vitest';
import { createRoomService, RoomServiceError } from './roomService';

describe('RoomService', () => {
  it('creates a six-character room with the creator role', () => {
    const service = createRoomService({ now: () => 1_000 });
    const created = service.createRoom('Maya');

    expect(created.snapshot.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(created.identity.participant.role).toBe('creator');
    expect(created.snapshot.participants).toHaveLength(1);
  });

  it('allows one guest and rejects a third participant', () => {
    const service = createRoomService({ now: () => 1_000 });
    const created = service.createRoom('Maya');
    service.joinRoom(created.snapshot.code, 'Noah');

    expect(() => service.joinRoom(created.snapshot.code, 'Ari')).toThrowError(
      expect.objectContaining({ code: 'ROOM_FULL' })
    );
  });

  it('accepts shared changes from either participant and increments revisions', () => {
    const service = createRoomService({ now: () => 1_000 });
    const creator = service.createRoom('Maya');
    const guest = service.joinRoom(creator.snapshot.code, 'Noah');

    const next = service.updateSharedConfig(
      creator.snapshot.code,
      guest.identity.participant.id,
      0,
      { background: { mode: 'preset', value: '/template-previews/pattern-love-notes.png' } }
    );

    expect(next.revision).toBe(1);
    expect(next.updatedBy).toBe('Noah');
    expect(next.shared.background.mode).toBe('preset');
  });

  it('rejects stale updates with the authoritative snapshot', () => {
    const service = createRoomService({ now: () => 1_000 });
    const creator = service.createRoom('Maya');
    service.updateSharedConfig(creator.snapshot.code, creator.identity.participant.id, 0, {
      layout: 'grid-2x2'
    });

    try {
      service.updateSharedConfig(creator.snapshot.code, creator.identity.participant.id, 0, {
        layout: 'vertical-1x4'
      });
      throw new Error('expected stale revision');
    } catch (error) {
      expect(error).toBeInstanceOf(RoomServiceError);
      expect((error as RoomServiceError).code).toBe('STALE_REVISION');
      expect((error as RoomServiceError).snapshot?.revision).toBe(1);
    }
  });

  it('rejects unsafe shared background payloads', () => {
    const service = createRoomService({ now: () => 1_000 });
    const creator = service.createRoom('Maya');

    expect(() =>
      service.updateSharedConfig(creator.snapshot.code, creator.identity.participant.id, 0, {
        background: { mode: 'preset', value: 'https://untrusted.example/tracker.png' }
      })
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PHASE' }));
  });

  it('allows either participant to control the shared capture session', () => {
    const service = createRoomService({ now: () => 1_000 });
    const creator = service.createRoom('Maya');
    const guest = service.joinRoom(creator.snapshot.code, 'Noah');

    const countdown = service.startCountdown(creator.snapshot.code, guest.identity.participant.id);
    expect(countdown.phase).toBe('countdown');
    expect(countdown.captureControllerId).toBe(guest.identity.participant.id);

    const accepted = service.acceptFrame(
      creator.snapshot.code,
      guest.identity.participant.id,
      'frame-1'
    );
    expect(accepted.acceptedFrameIds).toEqual(['frame-1']);

    const retaken = service.retakeFrame(creator.snapshot.code, guest.identity.participant.id, 0);
    expect(retaken.acceptedFrameIds).toEqual([]);
  });

  it('allows either participant to finish after four accepted frames', () => {
    const service = createRoomService({ now: () => 1_000 });
    const creator = service.createRoom('Maya');
    const guest = service.joinRoom(creator.snapshot.code, 'Noah');
    for (let index = 0; index < 4; index += 1) {
      service.acceptFrame(creator.snapshot.code, creator.identity.participant.id, `frame-${index}`);
    }

    expect(service.finish(creator.snapshot.code, guest.identity.participant.id).phase).toBe('complete');
  });

  it('restores an identity with its reconnect token', () => {
    const service = createRoomService({ now: () => 1_000 });
    const created = service.createRoom('Maya');
    service.disconnect(created.snapshot.code, created.identity.participant.id);
    const restored = service.reconnect(created.snapshot.code, created.identity.reconnectToken);

    expect(restored.identity.participant.id).toBe(created.identity.participant.id);
    expect(restored.identity.participant.connection).toBe('connected');
  });
});
