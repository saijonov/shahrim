import { Component } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of children if they throw (incl. lazy-load failures). */
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Minimal error boundary. Used to wrap the (native-module-dependent) map so a
 * failure to load or render react-native-maps degrades to a coords-only
 * fallback instead of crashing the report flow (PRD §5 / task requirement).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
