import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteBoothView } from './RemoteBooth';

const shared = {
  layout: 'vertical-1x4' as const,
  templateId: 'airmail' as const,
  filterPreset: 'normal' as const,
  background: { mode: 'original' as const }
};

describe('RemoteBoothView', () => {
  it('shows shared capture controls to a guest as well as the creator', () => {
    render(
      <RemoteBoothView
        code="ABC234"
        participants={[
          { id: 'creator', name: 'Maya', role: 'creator', ready: true, connection: 'connected' },
          { id: 'guest', name: 'Noah', role: 'guest', ready: true, connection: 'connected' }
        ]}
        selfId="guest"
        shared={shared}
        phase="ready"
        frameUrls={[]}
        onCapture={vi.fn()}
        onFinish={vi.fn()}
        onRetake={vi.fn()}
        onBackgroundChange={vi.fn()}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
      />
    );

    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument();
  });

  it('shows two equal participant feed panels', () => {
    render(
      <RemoteBoothView
        code="ABC234"
        participants={[
          { id: 'creator', name: 'Maya', role: 'creator', ready: true, connection: 'connected' },
          { id: 'guest', name: 'Noah', role: 'guest', ready: true, connection: 'connected' }
        ]}
        selfId="creator"
        shared={shared}
        phase="ready"
        frameUrls={[]}
        onCapture={vi.fn()}
        onFinish={vi.fn()}
        onRetake={vi.fn()}
        onBackgroundChange={vi.fn()}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
      />
    );
    expect(screen.getByTestId('remote-feed-grid').children).toHaveLength(2);
  });
});
