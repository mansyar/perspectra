import { Component, type ReactNode } from 'react';

interface RendererErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

/** Catches synchronous renderer/scene failures so the ladder can step down. */
export class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
