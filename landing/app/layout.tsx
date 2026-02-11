import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AgentHub | Monad-Native AI Agent Orchestration',
  description:
    'Production-grade orchestration platform for AI agent teams on Monad blockchain. Multi-sig security, parallel execution, observable workflows.',
  keywords: [
    'monad',
    'blockchain',
    'ai agents',
    'defi',
    'orchestration',
    'web3',
    'parallel execution',
  ],
  openGraph: {
    title: 'AgentHub - AI Agent Teams on Monad',
    description:
      'The only agent platform built for Monad\'s 10,000 TPS. What costs $18K on Ethereum costs $0.68 here.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .min-h-screen {
            min-height: 100vh;
          }
          .max-w-6xl {
            max-width: 72rem;
          }
          .max-w-3xl {
            max-width: 48rem;
          }
          .max-w-md {
            max-width: 28rem;
          }
          .mx-auto {
            margin-left: auto;
            margin-right: auto;
          }
          .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
          .py-20 {
            padding-top: 5rem;
            padding-bottom: 5rem;
          }
          .py-8 {
            padding-top: 2rem;
            padding-bottom: 2rem;
          }
          .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .px-8 {
            padding-left: 2rem;
            padding-right: 2rem;
          }
          .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
          .p-6 {
            padding: 1.5rem;
          }
          .pt-12 {
            padding-top: 3rem;
          }
          .pt-20 {
            padding-top: 5rem;
          }
          .pt-8 {
            padding-top: 2rem;
          }
          .pt-4 {
            padding-top: 1rem;
          }
          .mt-20 {
            margin-top: 5rem;
          }
          .mt-4 {
            margin-top: 1rem;
          }
          .text-center {
            text-align: center;
          }
          .space-y-8 > * + * {
            margin-top: 2rem;
          }
          .space-y-4 > * + * {
            margin-top: 1rem;
          }
          .space-y-3 > * + * {
            margin-top: 0.75rem;
          }
          .space-y-2 > * + * {
            margin-top: 0.5rem;
          }
          .gap-8 {
            gap: 2rem;
          }
          .gap-4 {
            gap: 1rem;
          }
          .gap-2 {
            gap: 0.5rem;
          }
          .grid {
            display: grid;
          }
          .grid-cols-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          .grid-cols-1 {
            grid-template-columns: repeat(1, 1fr);
          }
          @media (min-width: 768px) {
            .md\\:grid-cols-3 {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          .flex {
            display: flex;
          }
          .flex-1 {
            flex: 1;
          }
          .items-center {
            align-items: center;
          }
          .justify-center {
            justify-content: center;
          }
          .inline-flex {
            display: inline-flex;
          }
          .bg-gradient-to-br {
            background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
          }
          .bg-gradient-to-r {
            background-image: linear-gradient(to right, var(--tw-gradient-stops));
          }
          .from-purple-900 {
            --tw-gradient-from: #581c87;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(88, 28, 135, 0));
          }
          .via-black {
            --tw-gradient-stops: var(--tw-gradient-from), #000, var(--tw-gradient-to, rgba(0, 0, 0, 0));
          }
          .to-blue-900 {
            --tw-gradient-to: #1e3a8a;
          }
          .from-purple-400 {
            --tw-gradient-from: #c084fc;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(192, 132, 252, 0));
          }
          .to-blue-400 {
            --tw-gradient-to: #60a5fa;
          }
          .from-purple-500 {
            --tw-gradient-from: #a855f7;
            --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(168, 85, 247, 0));
          }
          .to-blue-500 {
            --tw-gradient-to: #3b82f6;
          }
          .text-white {
            color: #fff;
          }
          .text-gray-300 {
            color: #d1d5db;
          }
          .text-gray-400 {
            color: #9ca3af;
          }
          .text-purple-400 {
            color: #c084fc;
          }
          .text-blue-400 {
            color: #60a5fa;
          }
          .text-green-400 {
            color: #4ade80;
          }
          .text-7xl {
            font-size: 4.5rem;
            line-height: 1;
          }
          .text-3xl {
            font-size: 1.875rem;
            line-height: 2.25rem;
          }
          .text-xl {
            font-size: 1.25rem;
            line-height: 1.75rem;
          }
          .text-4xl {
            font-size: 2.25rem;
            line-height: 2.5rem;
          }
          .text-2xl {
            font-size: 1.5rem;
            line-height: 2rem;
          }
          .text-lg {
            font-size: 1.125rem;
            line-height: 1.75rem;
          }
          .text-sm {
            font-size: 0.875rem;
            line-height: 1.25rem;
          }
          .font-bold {
            font-weight: 700;
          }
          .font-semibold {
            font-weight: 600;
          }
          .font-light {
            font-weight: 300;
          }
          .uppercase {
            text-transform: uppercase;
          }
          .tracking-wider {
            letter-spacing: 0.05em;
          }
          .leading-relaxed {
            line-height: 1.625;
          }
          .bg-clip-text {
            background-clip: text;
            -webkit-background-clip: text;
          }
          .text-transparent {
            color: transparent;
          }
          .border {
            border-width: 1px;
          }
          .border-t {
            border-top-width: 1px;
          }
          .border-white\\/10 {
            border-color: rgba(255, 255, 255, 0.1);
          }
          .border-white\\/20 {
            border-color: rgba(255, 255, 255, 0.2);
          }
          .bg-white\\/5 {
            background-color: rgba(255, 255, 255, 0.05);
          }
          .bg-white\\/10 {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .rounded-lg {
            border-radius: 0.5rem;
          }
          input:focus {
            outline: none;
          }
          .focus\\:border-purple-400:focus {
            border-color: #c084fc;
          }
          button {
            cursor: pointer;
            transition: all 0.2s;
          }
          .hover\\:from-purple-600:hover {
            --tw-gradient-from: #9333ea;
          }
          .hover\\:to-blue-600:hover {
            --tw-gradient-to: #2563eb;
          }
          .hover\\:text-white:hover {
            color: #fff;
          }
          .transition-all {
            transition-property: all;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
          }
          .transition-colors {
            transition-property: color, background-color, border-color;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 150ms;
          }
          .w-6 {
            width: 1.5rem;
          }
          .h-6 {
            height: 1.5rem;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
