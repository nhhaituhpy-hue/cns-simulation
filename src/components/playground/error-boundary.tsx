"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback: (error: Error) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export class PlaygroundErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch() {}
  render() {
    if (this.state.error) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}