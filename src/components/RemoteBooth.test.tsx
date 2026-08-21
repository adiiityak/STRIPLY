import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteBoothView } from './RemoteBooth';

const shared = {
  layout: 'vertical-1x4' as const,
  templateId: 'airmail' as const,
  filterPreset: 'normal' as const,
  background: { mode: 'original' as const }
};

describe('RemoteBoothView', () => {
  it('counts only currently connected participants', () => {
    render(
      <RemoteBoothView
        code="ABC234"
        participants={[
          { id: 'a', name: 'Maya', role: 'creator', ready: false, connection: 'connected' },
          { id: 'b', name: 'Noah', role: 'guest', ready: false, connection: 'disconnected' }
        ]}
        selfId="a"
        shared={shared}
        phase="lobby"
        frameUrls={[]}
        onCapture={vi.fn()}
        onFinish={vi.fn()}
        onRetake={vi.fn()}
        onBackgroundChange={vi.fn()}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
      />
    );

    expect(screen.getByText('1/2 joined')).toBeInTheDocument();
  });

  it('offers the guest the same one-tap start as the creator', () => {
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

    // Either person can start the run, and it is a single press for all four.
    const start = screen.getByRole('button', { name: /start photo booth/i });
    expect(start).toBeInTheDocument();
    expect(start).toBeEnabled();
    // The finish step is automatic now, so nothing should ask to be pressed.
    expect(screen.queryByRole('button', { name: /finish together/i })).not.toBeInTheDocument();
  });

  it('reports progress instead of inviting another press mid-run', () => {
    render(
      <RemoteBoothView
        code="ABC234"
        participants={[
          { id: 'creator', name: 'Maya', role: 'creator', ready: true, connection: 'connected' },
          { id: 'guest', name: 'Noah', role: 'guest', ready: true, connection: 'connected' }
        ]}
        selfId="guest"
        shared={shared}
        phase="countdown"
        targetAt={Date.now() + 4_000}
        frameUrls={['data:image/jpeg;base64,AAA']}
        onCapture={vi.fn()}
        onFinish={vi.fn()}
        onRetake={vi.fn()}
        onBackgroundChange={vi.fn()}
        localVideoRef={{ current: null }}
        remoteVideoRef={{ current: null }}
      />
    );

    const control = screen.getByRole('button', { name: /taking photo 2 of 4/i });
    expect(control).toBeDisabled();
    expect(screen.getByText(/make half a heart/i)).toBeInTheDocument();
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
    expect(screen.getByTestId('remote-feed-grid').querySelectorAll('video')).toHaveLength(2);
  });

  it('uses a compact mobile stack and moves controls beside the feed on desktop', () => {
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

    expect(screen.getByTestId('remote-booth-layout')).toHaveClass(
      'lg:grid-cols-[minmax(0,1fr)_20rem]'
    );
    expect(screen.getByTestId('remote-booth-controls')).toHaveClass('lg:col-start-2');
    expect(screen.getByTestId('remote-feed-grid')).toHaveClass('aspect-video', 'lg:aspect-[4/3]');
  });

  describe('copy invite button', () => {
    const participants = [
      { id: 'creator', name: 'Maya', role: 'creator' as const, ready: true, connection: 'connected' as const },
      { id: 'guest', name: 'Noah', role: 'guest' as const, ready: true, connection: 'connected' as const }
    ];

    const renderView = () =>
      render(
        <RemoteBoothView
          code="ABC234"
          participants={participants}
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

    const stubClipboard = (writeText: () => Promise<void>) => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
        writable: true
      });
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it('copies the invite link for the room', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);
      renderView();

      fireEvent.click(screen.getByRole('button', { name: /copy invite/i }));

      await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?room=ABC234')));
    });

    it('confirms the copy, then returns to its normal label', async () => {
      // Fake timers must be installed before the click so the revert timeout is
      // scheduled against them.
      vi.useFakeTimers();
      stubClipboard(vi.fn().mockResolvedValue(undefined));
      renderView();

      fireEvent.click(screen.getByRole('button', { name: /copy invite/i }));
      // Settle the clipboard promise; microtasks are not driven by fake timers.
      await act(async () => {});

      const confirmed = screen.getByRole('button', { name: /copied invite/i });
      // The confirmed state is the dark treatment, not just a new label.
      expect(confirmed.className).toContain('bg-[#2D2D2D]');
      expect(confirmed.className).toContain('text-white');

      act(() => {
        vi.advanceTimersByTime(2_000);
      });

      const reverted = screen.getByRole('button', { name: /^copy invite$/i });
      expect(reverted.className).toContain('bg-white');
      expect(reverted.className).not.toContain('bg-[#2D2D2D]');
    });

    // Confirming a copy that never happened would be a lie the user acts on.
    it('stays in its normal state when the clipboard rejects', async () => {
      stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
      renderView();

      fireEvent.click(screen.getByRole('button', { name: /copy invite/i }));

      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /copied invite/i })).not.toBeInTheDocument()
      );
      expect(screen.getByRole('button', { name: /^copy invite$/i })).toBeInTheDocument();
    });
  });
});
