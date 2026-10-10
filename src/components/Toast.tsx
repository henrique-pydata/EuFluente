import { CheckCircle2, Info, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({ message, type = 'success' }: ToastProps) {
  if (!message) return null;
  const Icon = type === 'error' ? XCircle : type === 'info' ? Info : CheckCircle2;
  return <div className={`toast toast-${type}`} role="status"><Icon size={17} />{message}</div>;
}
