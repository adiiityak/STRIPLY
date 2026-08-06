# Remote Booth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-capable two-person Striply booth with room codes, peer-to-peer side-by-side video, synchronized four-shot capture, and a shared background controlled by either participant.

**Architecture:** The Express process owns an authoritative in-memory room service and Socket.IO signaling/state channel. Browser clients exchange video with WebRTC, composite both feeds over one shared background locally, and hand ordinary `PhotoItem[]` plus `StripConfiguration` back to the existing editor. Background removal is an optional local enhancement and must fall back to the original camera feed without blocking the booth.

**Tech Stack:** React 19, TypeScript, Express 4, Socket.IO, WebRTC, Canvas 2D, Vitest, Testing Library, Playwright, optional MediaPipe Tasks Vision.

## Global Constraints

- Exactly two active participants per room: creator and guest.
- Room codes contain six unambiguous uppercase characters and are generated with `crypto.randomBytes`.
- Rooms expire 30 minutes after last activity; disconnected identities have a 60-second reconnection grace period.
- Both participants may change the shared template, layout, filter, and one shared background.
- Only the creator may start countdowns, retake frames, finish, or close the room.
- Shared state is server-authoritative and revisioned; stale revisions are rejected with the latest room snapshot.
- Media is peer-to-peer; Socket.IO carries only state and WebRTC signaling.
- Audio is never requested or transmitted.
- Remote capture always produces four side-by-side composite frames.
- Existing solo booth, PNG, PDF, and sharing behavior must remain functional.
- Camera and WebRTC require HTTPS outside localhost; TURN configuration is supplied through environment variables.

---

## File Structure

- `src/remote/types.ts`: shared room, participant, signaling, and command types.
- `server/roomService.ts`: pure authoritative room state machine.
- `server/roomSocket.ts`: Socket.IO transport, validation, and signaling relay.
- `server/app.ts`: testable Express/HTTP/Socket.IO server factory.
- `src/remote/roomClient.ts`: typed Socket.IO client boundary.
- `src/remote/useRoomSession.ts`: React lifecycle and authoritative-state hook.
- `src/remote/usePeerVideo.ts`: WebRTC negotiation and media-track lifecycle.
- `src/remote/compositeCapture.ts`: deterministic shared-background/side-by-side canvas compositor.
- `src/remote/useBackgroundRemoval.ts`: optional segmentation boundary with safe fallback.
- `src/components/RoomEntry.tsx`: create/join/name workflow.
- `src/components/RemoteBooth.tsx`: lobby, participant feeds, shared controls, countdown, review, finish.
- `src/components/BackgroundPicker.tsx`: original/removed/preset/uploaded shared background UI.
- `src/components/WebcamModal.tsx`: mode picker that preserves solo capture and opens Remote Booth.
- `src/App.tsx`: accepts completed room photos/config into the existing editor.

---

### Task 1: Install real-time dependencies and define the room protocol

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/remote/types.ts`
- Test: `src/remote/types.test.ts`

**Interfaces:**
- Produces: `RoomSnapshot`, `ParticipantSnapshot`, `SharedRoomConfig`, `RoomPhase`, `RoomErrorCode`, `ClientToServerEvents`, `ServerToClientEvents`.

- [ ] **Step 1: Write the failing protocol test**

```ts
it('recognizes the complete room phase sequence', () => {
  expect(ROOM_PHASES).toEqual(['lobby', 'ready', 'countdown', 'review', 'complete', 'closed']);
});
```

- [ ] **Step 2: Run the test and verify `ROOM_PHASES` is missing**

Run: `npm test -- src/remote/types.test.ts`
Expected: FAIL because `src/remote/types.ts` does not exist.

- [ ] **Step 3: Install and define the protocol**

Run: `npm install socket.io socket.io-client`

```ts
export const ROOM_PHASES = ['lobby', 'ready', 'countdown', 'review', 'complete', 'closed'] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];
export interface SharedRoomConfig {
  layout: PhotoLayout;
  templateId: StripStyle;
  filterPreset: FilterPreset;
  background: { mode: 'original' | 'removed' | 'preset' | 'uploaded'; value?: string };
}
```

- [ ] **Step 4: Run the protocol test**

Run: `npm test -- src/remote/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/remote/types.ts src/remote/types.test.ts
git commit -m "feat: define remote booth protocol"
```

### Task 2: Build the authoritative room state machine

**Files:**
- Create: `server/roomService.ts`
- Test: `server/roomService.test.ts`

**Interfaces:**
- Consumes: `RoomSnapshot`, `SharedRoomConfig`.
- Produces: `RoomService.createRoom(name)`, `joinRoom(code, name)`, `reconnect(code, token)`, `updateSharedConfig(code, participantId, baseRevision, patch)`, `startCountdown(code, participantId, targetAt)`, `acceptFrame(code, participantId, frameId)`, `finish(code, participantId)`, `disconnect(code, participantId)`, `sweepExpired(now)`.

- [ ] **Step 1: Write failing tests for code format, capacity, roles, revisions, permissions, reconnect, and expiry**

```ts
it('rejects a third active participant', () => {
  const service = createRoomService({ now: () => 1_000 });
  const room = service.createRoom('Maya');
  service.joinRoom(room.code, 'Noah');
  expect(() => service.joinRoom(room.code, 'Ari')).toThrowError('ROOM_FULL');
});

it('rejects guest capture commands', () => {
  const service = createRoomService({ now: () => 1_000 });
  const creator = service.createRoom('Maya');
  const guest = service.joinRoom(creator.code, 'Noah');
  expect(() => service.startCountdown(creator.code, guest.participant.id, 5_000)).toThrowError('FORBIDDEN');
});
```

- [ ] **Step 2: Run the service tests and verify they fail because the service is missing**

Run: `npm test -- server/roomService.test.ts`

- [ ] **Step 3: Implement the minimal in-memory state machine**

Use `Map<string, InternalRoom>`, inject `now()` and `randomBytes()`, return immutable snapshots, validate every transition, and increment `revision` only after accepted shared changes.

- [ ] **Step 4: Run room service tests**

Run: `npm test -- server/roomService.test.ts`
Expected: PASS for all state and authorization cases.

- [ ] **Step 5: Commit**

```bash
git add server/roomService.ts server/roomService.test.ts
git commit -m "feat: add authoritative room service"
```

### Task 3: Add the Socket.IO server and a testable server factory

**Files:**
- Create: `server/app.ts`
- Create: `server/roomSocket.ts`
- Modify: `server.ts`
- Test: `server/roomSocket.test.ts`

**Interfaces:**
- Consumes: `RoomService`, typed Socket.IO protocol.
- Produces: `createStriplyServer(options)` returning `{ app, httpServer, io, roomService }` and socket events `room:create`, `room:join`, `room:reconnect`, `room:update`, `capture:start`, `capture:accept`, `room:finish`, `signal:offer`, `signal:answer`, `signal:ice`.

- [ ] **Step 1: Write failing two-client integration tests**

```ts
it('broadcasts an accepted shared background update to both clients', async () => {
  const { creator, guest } = await connectRoomPair();
  creator.emit('room:update', { baseRevision: 0, patch: { background: { mode: 'preset', value: 'love-notes' } } });
  const [a, b] = await Promise.all([nextRoomState(creator), nextRoomState(guest)]);
  expect(a.revision).toBe(1);
  expect(b.shared.background.value).toBe('love-notes');
});
```

- [ ] **Step 2: Run and verify failure because the server factory is missing**

Run: `npm test -- server/roomSocket.test.ts`

- [ ] **Step 3: Implement Socket.IO bindings and signaling relay**

Validate payload shapes, bind socket identity on create/join/reconnect, join `room:${code}`, relay signaling only to the other authorized participant, broadcast snapshots after accepted commands, and disconnect identities through `RoomService`.

- [ ] **Step 4: Run the integration tests**

Run: `npm test -- server/roomSocket.test.ts`
Expected: PASS for create/join/update/full/forbidden/signaling/disconnect cases.

- [ ] **Step 5: Commit**

```bash
git add server.ts server/app.ts server/roomSocket.ts server/roomSocket.test.ts
git commit -m "feat: expose remote booth socket server"
```

### Task 4: Build the typed room client and session hook

**Files:**
- Create: `src/remote/roomClient.ts`
- Create: `src/remote/useRoomSession.ts`
- Test: `src/remote/useRoomSession.test.tsx`

**Interfaces:**
- Produces: `useRoomSession()` returning `{ status, snapshot, self, error, createRoom, joinRoom, updateSharedConfig, startCountdown, acceptFrame, finishRoom, sendSignal, leaveRoom }`.

- [ ] **Step 1: Write failing hook tests**

```tsx
it('ignores room snapshots older than the current revision', () => {
  const { result } = renderHook(() => useRoomSession({ socket: fakeSocket }));
  act(() => fakeSocket.serverEmit('room:state', snapshot(3)));
  act(() => fakeSocket.serverEmit('room:state', snapshot(2)));
  expect(result.current.snapshot?.revision).toBe(3);
});
```

- [ ] **Step 2: Run and verify the hook is missing**

Run: `npm test -- src/remote/useRoomSession.test.tsx`

- [ ] **Step 3: Implement client lifecycle**

Persist only the room code and reconnection token in `sessionStorage`, remove listeners on unmount, discard stale revisions, expose server error codes as user-facing states, and never duplicate socket connections during React strict-mode remounts.

- [ ] **Step 4: Run hook tests**

Run: `npm test -- src/remote/useRoomSession.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/remote/roomClient.ts src/remote/useRoomSession.ts src/remote/useRoomSession.test.tsx
git commit -m "feat: add remote room session client"
```

### Task 5: Add WebRTC peer video

**Files:**
- Create: `src/remote/usePeerVideo.ts`
- Test: `src/remote/usePeerVideo.test.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: local `MediaStream`, `sendSignal`, incoming signaling events.
- Produces: `{ remoteStream, connectionState, retry, close }`.

- [ ] **Step 1: Write failing negotiation and cleanup tests with a small fake `RTCPeerConnection`**

```tsx
it('adds every local video track and publishes the creator offer', async () => {
  const stream = fakeMediaStream(1);
  renderHook(() => usePeerVideo({ role: 'creator', localStream: stream, sendSignal }));
  await waitFor(() => expect(sendSignal).toHaveBeenCalledWith('offer', expect.anything()));
  expect(peer.addTrack).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run and verify failure because the hook is missing**

Run: `npm test -- src/remote/usePeerVideo.test.tsx`

- [ ] **Step 3: Implement perfect-negotiation-style offer/answer/ICE flow**

Load ICE servers from `VITE_WEBRTC_STUN_URL` and optional `VITE_WEBRTC_TURN_URL`, `VITE_WEBRTC_TURN_USERNAME`, `VITE_WEBRTC_TURN_CREDENTIAL`; add only video tracks; close peer connections and stop owned tracks on teardown.

- [ ] **Step 4: Run peer tests**

Run: `npm test -- src/remote/usePeerVideo.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/remote/usePeerVideo.ts src/remote/usePeerVideo.test.tsx .env.example
git commit -m "feat: connect remote booth peer video"
```

### Task 6: Build deterministic side-by-side composition

**Files:**
- Create: `src/remote/compositeCapture.ts`
- Test: `src/remote/compositeCapture.test.ts`

**Interfaces:**
- Produces: `composeRemoteFrame({ localSource, remoteSource, background, width, height, localOnLeft }): Promise<string>`.

- [ ] **Step 1: Write failing geometry tests**

```ts
it('draws one shared background before two equal participant halves', async () => {
  await composeRemoteFrame(fixture);
  expect(drawCalls).toEqual([
    ['background', 0, 0, 1200, 900],
    ['local', 0, 0, 600, 900],
    ['remote', 600, 0, 600, 900]
  ]);
});
```

- [ ] **Step 2: Run and verify compositor is missing**

Run: `npm test -- src/remote/compositeCapture.test.ts`

- [ ] **Step 3: Implement bounded JPEG composition**

Crop each video source with cover semantics, mirror only the local feed, draw the shared background once, add a 2-pixel divider, and return JPEG quality `0.88` at maximum `1280×960`.

- [ ] **Step 4: Run compositor tests**

Run: `npm test -- src/remote/compositeCapture.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/remote/compositeCapture.ts src/remote/compositeCapture.test.ts
git commit -m "feat: compose side-by-side booth frames"
```

### Task 7: Add optional background removal and shared background controls

**Files:**
- Create: `src/remote/useBackgroundRemoval.ts`
- Create: `src/components/BackgroundPicker.tsx`
- Test: `src/remote/useBackgroundRemoval.test.tsx`
- Test: `src/components/BackgroundPicker.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `useBackgroundRemoval(stream, enabled)` returning `{ processedStream, status, disable }`; `BackgroundPicker` emits `SharedRoomConfig['background']`.

- [ ] **Step 1: Write failing fallback and control tests**

```tsx
it('falls back to the original stream when segmentation cannot initialize', async () => {
  const { result } = renderHook(() => useBackgroundRemoval(original, true, { createSegmenter: rejects }));
  await waitFor(() => expect(result.current.status).toBe('fallback'));
  expect(result.current.processedStream).toBe(original);
});
```

- [ ] **Step 2: Run and verify failure because the hook and picker are missing**

Run: `npm test -- src/remote/useBackgroundRemoval.test.tsx src/components/BackgroundPicker.test.tsx`

- [ ] **Step 3: Install MediaPipe and implement the enhancement boundary**

Run: `npm install @mediapipe/tasks-vision`

Lazy-load the model only after `Removed`, `Preset`, or `Uploaded` is selected; render to a canvas capture stream; limit uploads to PNG/JPEG/WebP under 8 MB; resize decoded backgrounds to at most 1600 pixels; use the current pattern assets as presets; revert to the original stream on initialization or performance failure.

- [ ] **Step 4: Run background tests**

Run: `npm test -- src/remote/useBackgroundRemoval.test.tsx src/components/BackgroundPicker.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/remote/useBackgroundRemoval.ts src/remote/useBackgroundRemoval.test.tsx src/components/BackgroundPicker.tsx src/components/BackgroundPicker.test.tsx
git commit -m "feat: add shared remote booth backgrounds"
```

### Task 8: Build room entry and the complete remote booth UI

**Files:**
- Create: `src/components/RoomEntry.tsx`
- Create: `src/components/RemoteBooth.tsx`
- Test: `src/components/RoomEntry.test.tsx`
- Test: `src/components/RemoteBooth.test.tsx`
- Modify: `src/components/WebcamModal.tsx`

**Interfaces:**
- Consumes: `useRoomSession`, `usePeerVideo`, `useBackgroundRemoval`, `composeRemoteFrame`, templates and layouts.
- Produces: `RemoteBooth` callback `onComplete(photos: PhotoItem[], config: StripConfiguration): void`.

- [ ] **Step 1: Write failing entry, permission, shared-control, and creator-only UI tests**

```tsx
it('does not show the Start capture control to a guest', () => {
  render(<RemoteBooth session={guestSession} />);
  expect(screen.queryByRole('button', { name: /start capture/i })).not.toBeInTheDocument();
});

it('normalizes pasted room codes', async () => {
  render(<RoomEntry onJoin={onJoin} />);
  await user.type(screen.getByLabelText(/room code/i), ' ab-12cd ');
  await user.click(screen.getByRole('button', { name: /join/i }));
  expect(onJoin).toHaveBeenCalledWith(expect.objectContaining({ code: 'AB12CD' }));
});
```

- [ ] **Step 2: Run and verify components are missing**

Run: `npm test -- src/components/RoomEntry.test.tsx src/components/RemoteBooth.test.tsx`

- [ ] **Step 3: Implement the mobile-first modal flow**

The first Web Booth screen offers `Solo Booth` and `Long-Distance Booth`. Remote entry supports create/join and a shareable `?room=CODE` URL. Lobby cards show both names/readiness. Live booth shows equal side-by-side feeds, connection state, shared layout/template/background controls, absolute-timestamp countdown, four-frame progress, creator-only capture/retake/finish, and non-blocking actor messages for synchronized edits.

- [ ] **Step 4: Run component tests**

Run: `npm test -- src/components/RoomEntry.test.tsx src/components/RemoteBooth.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/RoomEntry.tsx src/components/RoomEntry.test.tsx src/components/RemoteBooth.tsx src/components/RemoteBooth.test.tsx src/components/WebcamModal.tsx
git commit -m "feat: add long-distance booth interface"
```

### Task 9: Hand completed room photos into the existing editor

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/WebcamModal.tsx`
- Test: `src/components/ControlsPanel.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `onRemoteSessionComplete(photos, config)`.
- Produces: normal editor state containing four remote composite `PhotoItem` objects.

- [ ] **Step 1: Write a failing application integration test**

```tsx
it('loads four completed remote frames and the shared configuration into the editor', async () => {
  render(<App />);
  completeRemoteBooth({ photos: fourRemoteFrames, config: sharedConfig });
  expect(await screen.findAllByAltText(/photo frame/i)).toHaveLength(4);
  expect(screen.getByText(/2 × 2/i)).toHaveAttribute('aria-pressed', 'true');
});
```

- [ ] **Step 2: Run and verify remote completion is not wired**

Run: `npm test -- src/App.test.tsx`

- [ ] **Step 3: Implement the editor handoff**

Set `photos` to the four room composites, merge only allowed shared fields into a fresh template config, close the booth, and show a success toast. Do not store peer streams or room tokens in editor state.

- [ ] **Step 4: Run application tests**

Run: `npm test -- src/App.test.tsx src/components/ControlsPanel.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/WebcamModal.tsx src/components/ControlsPanel.test.tsx
git commit -m "feat: load remote booth captures in editor"
```

### Task 10: Add browser coverage, documentation, and final verification

**Files:**
- Create: `tests/remote-booth.spec.ts`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Verifies the end-to-end contract from room creation to editor/export.

- [ ] **Step 1: Write the two-context Playwright test using fake media devices**

```ts
test('two participants join, share a background, and complete four frames', async ({ browser }) => {
  const creator = await browser.newContext({ permissions: ['camera'] });
  const guest = await browser.newContext({ permissions: ['camera'] });
  // Create, join, assert both names, change shared preset from guest,
  // capture four frames from creator, and assert editor completion in both contexts.
});
```

- [ ] **Step 2: Run the browser test and verify the first unsupported step fails**

Run: `npm run test:e2e -- tests/remote-booth.spec.ts`

- [ ] **Step 3: Complete test fixtures and document operation**

Document HTTPS, STUN/TURN variables, one-process room limitation, 30-minute expiry, the two-person limit, room privacy, optional background removal, and the manual iPhone/Android pairing checklist.

- [ ] **Step 4: Run the full verification matrix**

```bash
npm test
npm run lint
npm run build
npm run test:e2e
git diff --check
```

Expected: all unit/integration/browser tests pass, TypeScript emits no errors, production build succeeds, and the working diff has no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add tests/remote-booth.spec.ts README.md .env.example
git commit -m "test: verify remote booth workflow"
```

