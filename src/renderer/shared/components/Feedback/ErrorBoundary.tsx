import { Component, type ReactNode, type ErrorInfo } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, error.stack, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <WifiOff className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Custosell needs a retry</h2>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Something went wrong opening this screen. Retry, or reconnect if the issue continues.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
