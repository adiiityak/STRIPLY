# Layouts, Visual Template Previews, and Long-Distance Booth Design

**Date:** 2026-08-07  
**Status:** Approved design  
**Scope:** Striply editor layout selection, visual template browsing, and a two-person remote photobooth

## Goals

1. Let users choose between a traditional four-frame vertical strip (`1×4`) and a four-frame grid (`2×2`).
2. Replace abstract template buttons with accurate miniature previews of the templates users will receive.
3. Let two people in different locations join a temporary room, see each other side-by-side, take synchronized photos, replace their backgrounds, and collaboratively style and export the result.

## Non-goals for the first release

- User accounts, saved room history, or a permanent cloud gallery.
- Rooms with more than two participants.
- Video recording, audio chat, public room discovery, or social feeds.
- Persistent uploaded backgrounds after a room expires.
- Multi-server room scaling in the initial deployment. The design leaves a Redis adapter seam for a later release.

## Product model

### Layouts

Add an explicit `PhotoLayout` value to strip configuration:

- `vertical-1x4`: four equal photo slots in one vertical column.
- `grid-2x2`: four equal photo slots in two rows and two columns.

Both layouts contain exactly four completed frames in the first release. The existing two-to-six photo-count control remains available for legacy vertical templates outside the guided booth flow. Selecting `grid-2x2` fixes the active count at four because other counts do not form the promised grid.

The layout changes photo-slot geometry only. The selected template continues to own its canvas background, frame treatment, captions, footer, filters, stickers, and export appearance. Templates that contain highly specialized vertical-only structure may declare that they do not support the grid. The selector disables `2×2` for those templates and explains why rather than producing a broken composition.

### Template previews

Every template card displays:

- A miniature image rendered from the real `StripCanvas` implementation.
- A representative four-photo sample set.
- The template name below the preview.
- A visible selected state and an accessible pressed state.

Preview images are generated ahead of time by a project script and checked into a dedicated public asset directory. The editor loads lightweight image assets instead of mounting every full canvas renderer in the sidebar. Regenerating previews is a documented step when template rendering changes. If a preview asset is missing, the card falls back to the existing color/icon treatment rather than becoming unusable.

The existing template categories remain. On small screens the category contains a horizontal, snap-scrolling preview carousel; on wider screens it uses a responsive grid.

## Long-distance booth user flow

### Entry

The Web Booth starts with two modes:

- **Solo Booth:** the current local-camera workflow.
- **Long-Distance Booth:** the new room workflow.

Long-Distance Booth offers `Create a Room` and `Join with Code`.

Creating a room returns a secure six-character code and a shareable URL containing that code. Joining requires the code and a short display name. A room supports exactly two active participant identities. Rooms expire 30 minutes after their last activity.

### Lobby

Before the live booth begins, each participant:

1. Grants camera permission.
2. Sees their own camera preview.
3. Sees the partner's connection/camera readiness.
4. Can select the shared layout, template, filter, and background.

Both participants can change shared styling controls. The server accepts the latest valid update, increments the room revision, and broadcasts the resulting state with the editing participant's name. The interface surfaces a brief message such as `Background changed by Maya`.

The room creator is the capture controller. Only the creator can start a countdown, retake a frame, finish the session, or close the room.

### Shared booth

The primary preview shows the two processed camera feeds side-by-side. It includes:

- Participant names and connection indicators.
- A four-frame progress indicator.
- `1×4` and `2×2` layout choices.
- Visual template cards.
- Background mode, presets, and upload.
- Shared filters and stickers.
- Creator-only `Start`, `Retake`, and `Finish` controls.

The server schedules countdowns against an absolute server timestamp. Both clients render `3–2–1` against that target rather than starting independent local timers. This keeps the visible countdown aligned despite normal message latency.

At the capture timestamp, the creator composites the locally processed camera stream and the received processed partner stream into one side-by-side frame. That composite becomes one `PhotoItem`. Four capture cycles create the four frames used by the selected layout.

The creator may retake a specific frame. A retake replaces only that frame and preserves the other three.

### Editor and completion

After the fourth accepted frame, both participants enter the normal Striply editor with the room configuration and photo set synchronized. Either participant can continue styling. The creator remains the only person who can change the accepted photo set by retaking.

Either participant can download PNG/PDF or invoke the system share sheet. Exports use the existing hardened image-readiness and aspect-preserving pipeline.

## Shared background and background removal

Background modes are:

- `Original`: show the camera background.
- `Removed`: show the person over transparency until a shared background is selected.
- `Preset`: place both people over one Striply background.
- `Uploaded`: place both people over one participant-uploaded background.

There is one shared background across the complete side-by-side frame. Both participants can select or upload it.

Person segmentation runs locally with MediaPipe Tasks Vision. Segmentation work runs off the main UI path in a worker-compatible boundary so it does not stall camera controls or countdown rendering. Each participant publishes a processed canvas stream through WebRTC. Raw camera media is not recorded by Striply.

Uploaded backgrounds are decoded, orientation-corrected, resized to a bounded resolution, compressed, and stored as temporary room assets. The room state references the asset rather than broadcasting a large data URL in every configuration update.

Background removal is an enhancement, not a requirement for capture. If the model fails to load, the device is too slow, or segmentation becomes unstable, the participant can continue with the original camera background. The UI explains the fallback and never blocks joining or capture.

## Architecture

### Client boundaries

- `LayoutPicker`: selects a supported photo layout and explains disabled combinations.
- `TemplatePreviewCard`: displays generated preview assets and selection state.
- `RoomEntry`: creates rooms, joins codes, validates names, and displays connection errors.
- `RemoteBooth`: coordinates lobby, live booth, capture progress, and transition into the editor.
- `ParticipantCamera`: presents local or remote processed media and readiness state.
- `BackgroundPicker`: controls original/removal/preset/uploaded background modes.
- `useRoomSession`: connects Socket.IO, applies authoritative room revisions, reconnects, and exposes room actions.
- `usePeerVideo`: owns `RTCPeerConnection`, signaling, ICE/TURN state, and processed media tracks.
- `useBackgroundRemoval`: loads MediaPipe, produces masks, monitors performance, and falls back safely.
- `CompositeCapture`: draws shared background, local person, remote person, and side-by-side divider into a bounded final image.

The room feature is isolated from the existing solo booth. It produces ordinary `PhotoItem[]` and `StripConfiguration` values at its boundary so the editor and export pipeline do not need to understand WebRTC.

### Server boundaries

The Express server gains Socket.IO and a `RoomService` with an in-memory implementation.

`RoomService` owns:

- Secure room-code generation.
- Two-participant membership and roles.
- Authoritative shared configuration and monotonically increasing revision.
- Capture phase, target countdown timestamp, and accepted frame asset identifiers.
- Last-activity and expiry timestamps.
- Reconnection tokens with a short grace period.
- Temporary background and captured-frame asset metadata.

Socket.IO rooms are used only as broadcast channels; clients never decide membership or role authorization. Every mutation is validated against server room state before it is broadcast.

Temporary binary room assets use bounded HTTP upload/download endpoints. The in-memory implementation deletes them when the room expires. The storage interface permits later replacement with object storage without changing room events.

### WebRTC

Socket.IO provides WebRTC offer/answer and ICE-candidate signaling. Media flows peer-to-peer. Production configuration supplies STUN and TURN servers; TURN is required as a fallback for network combinations that cannot establish a direct path.

The initial room service targets one Striply server process. A later multi-instance deployment must add a shared room store, shared asset storage, and the Socket.IO Redis adapter before enabling horizontal scaling.

## Room state and conflict handling

Every accepted shared-state update contains:

- Room code.
- Participant identity.
- Base revision observed by the sender.
- Changed configuration fields.
- Server-assigned resulting revision and timestamp.

The server applies valid styling updates in arrival order. The latest accepted update wins. It broadcasts the complete changed fields, resulting revision, and actor name. Clients discard events older than their current revision.

Capture-control events are not latest-change-wins updates. They are creator-authorized state transitions with explicit valid phases: `lobby`, `ready`, `countdown`, `capturing`, `review`, and `complete`.

## Failure handling

- **Invalid or expired code:** retain the entered name and offer another code attempt.
- **Room full:** explain the two-person limit without exposing participant details.
- **Camera denied:** provide browser-specific recovery guidance and a retry action.
- **Partner disconnected:** pause capture and preserve room state during a 60-second reconnection window.
- **Creator disconnected:** disable creator-only actions until the creator reconnects; do not silently promote the guest.
- **WebRTC direct connection failure:** continue ICE negotiation through configured TURN. If all candidates fail, show a retryable connection error.
- **Background model failure or overload:** revert that participant to the original camera feed.
- **Background upload failure:** keep the current background and report the rejected type/size or network failure.
- **Capture upload failure:** keep the booth in review and allow retry without advancing the frame counter.
- **Out-of-date shared edit:** apply the newer authoritative state and identify the participant whose update won.
- **Server restart:** rooms from the in-memory first release expire; participants receive a clear room-ended state.

## Privacy and security

- Room codes are generated with a cryptographically secure random source and are not sequential.
- Join and mutation endpoints are rate-limited.
- Room capacity, roles, event payloads, asset types, and asset sizes are validated on the server.
- Uploaded file names are never used as storage paths.
- Camera and segmentation processing occur on-device.
- The server does not record live video or audio.
- Temporary room assets are deleted at expiry and are accessible only through unguessable room-scoped identifiers.
- WebRTC and camera access require HTTPS outside localhost.
- The UI tells participants what media is transmitted and when a captured frame is temporarily stored.

## Testing strategy

### Unit tests

- Layout support and `1×4`/`2×2` slot geometry.
- Unsupported template/layout combinations.
- Template preview asset lookup and fallback.
- Room-code generation format and collision retry.
- Room capacity, roles, expiry, and reconnection grace period.
- Revision ordering and latest-change-wins behavior.
- Creator-only capture transitions.
- Shared-background scaling and side-by-side composition geometry.
- Background-removal fallback behavior.

### Integration tests

- Two Socket.IO clients create and join one room.
- Shared styling changes propagate with increasing revisions and actor labels.
- A third client is rejected.
- Guest capture-control events are rejected.
- Countdown target and capture phases arrive at both clients.
- Disconnect/reconnect restores the same participant identity.
- Room expiry removes temporary assets.

### Browser tests

- Two independent browser contexts connect using fake camera streams.
- Both processed feeds appear side-by-side.
- Background preset and upload changes synchronize in both directions.
- Four synchronized captures populate both layouts.
- Individual retake replaces the selected frame.
- Both participants see continued editor changes.
- PNG, PDF, and system-share images contain both participants and the selected shared background.

### Manual device matrix

- Current Safari on a physical iPhone.
- Current Chrome on a physical Android phone.
- Desktop Chrome/Safari as creator paired with each phone as guest.
- Wi-Fi-to-cellular pairing to exercise TURN fallback.
- Background-removal enabled and fallback-disabled modes on lower-powered devices.

## Delivery sequence

This scope is delivered in dependency order:

1. Add the explicit layout model and implement `1×4` and `2×2` rendering/export.
2. Add generated visual template previews and the responsive selector.
3. Extract reusable local camera and composition primitives from the solo booth.
4. Add Socket.IO room state, codes, authorization, expiry, and temporary assets.
5. Add WebRTC signaling, peer video, TURN configuration, and reconnection.
6. Add synchronized countdown and side-by-side composite capture.
7. Add MediaPipe background removal, presets, and uploaded shared backgrounds.
8. Synchronize the completed photo set and editor configuration.
9. Complete integration, browser, export, and physical-device verification.

Each step must leave the existing solo booth and export paths functional.
