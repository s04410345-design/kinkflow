"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 以至於下一個 render 能夠顯示 fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName || '模組'} 發生錯誤:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-red-50/50 rounded-2xl border border-red-200">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-red-800 mb-2">
            {this.props.moduleName || '此區塊'}發生了預期外的錯誤
          </h2>
          <p className="text-sm text-red-600/80 mb-4 text-center max-w-md">
            這只會影響到目前的區塊，網站的其他功能仍可正常使用。
          </p>
          <button
            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-lg transition-colors text-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            🔄 重新載入此區塊
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
