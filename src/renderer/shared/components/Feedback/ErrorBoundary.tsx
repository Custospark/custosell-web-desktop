import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw, House, Frown } from 'lucide-react';
import { store } from '../../../app/store/store';
import { getDefaultRoute } from '../../utils/moduleAccess';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary. Recovers to the closest safe surface rather than a
 * dead screen: Retry in place, or land on the dashboard (signed in) or home
 * (guest) via a fresh page load. Friendly, reassuring copy.
 */
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

  handleRecover = () => {
    const user = store.getState().auth?.user ?? null;
    const target = getDefaultRoute(user);
    window.location.assign(target);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const user = store.getState().auth?.user ?? null;
      const isStorefrontBuyer = user?.account_type === 'storefront_buyer';
      const isPersonal = user?.account_type === 'personal';
      const homeLabel = isStorefrontBuyer ? 'Back to shopping' : isPersonal ? 'Back to your tools' : 'Back to dashboard';

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <span className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Frown className="h-10 w-10 text-amber-600" aria-hidden />
          </span>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Sorry, we hit a bump</h2>
          <p className="mb-1 max-w-md text-sm text-gray-500">
            Something went wrong while loading this screen. No action was lost on your end - your
            work is safe. You can try again, or head back.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <button
              onClick={this.handleRecover}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <House className="h-4 w-4" />
              {homeLabel}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}