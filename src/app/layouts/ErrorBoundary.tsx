import { Component, type ReactNode } from 'react';

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <section role="alert" className="p-4">
          <h1 className="text-2xl m-0 mb-2">Algo salió mal</h1>
          <p className="m-0">{this.state.error.message}</p>
        </section>
      );
    }
    return this.props.children;
  }
}
