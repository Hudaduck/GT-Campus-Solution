import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  moduleName: string;
  fallbackTitle?: string;
  onReset?: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Fault Isolation] Module "${this.props.moduleName}" encountered an error:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (err) {
        console.error('Error during onReset handler:', err);
      }
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          data-testid={`error-boundary-${this.props.moduleName.toLowerCase().replace(/\s+/g, '-')}`}
          className="p-6 m-4 rounded-2xl bg-tp-surface border border-[#B39051]/35 text-tp-ink shadow-xl flex flex-col items-center text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-[#B39051]/15 text-tp-accent flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-tp-ink">
              {this.props.fallbackTitle || `${this.props.moduleName} is temporarily unavailable`}
            </h3>
            <p className="text-sm text-tp-muted mt-1 max-w-md">
              A fault occurred in this module, but other features remain fully active and responsive.
            </p>
            {this.state.error && (
              <div className="mt-3 p-2 bg-tp-canvas rounded text-xs font-mono text-red-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-[#B39051] text-[#051E39] font-semibold text-sm rounded-xl hover:bg-[#8F713D] active:bg-[#8F713D] transition-all shadow-md active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
