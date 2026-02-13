export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 text-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          {/* Logo/Title */}
          <div className="space-y-4">
            <h1 className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              AgentHub
            </h1>
            <p className="text-3xl font-light text-gray-300">
              The orchestration layer for AI agent teams on Monad
            </p>
          </div>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Production-grade shared memory, wallet primitives, and observable
            execution. Built for the only blockchain that can handle agent
            swarms at scale.
          </p>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-purple-400">10,000</div>
              <div className="text-sm text-gray-400">TPS on Monad</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-400">800ms</div>
              <div className="text-sm text-gray-400">Finality</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-400">$0.68</div>
              <div className="text-sm text-gray-400">vs $18K on ETH</div>
            </div>
          </div>

          {/* Email Waitlist */}
          <div className="pt-12">
            <form
              {/* TODO: Replace with your Formspree form ID */}
              action=""
              method="POST"
              className="max-w-md mx-auto"
            >
              <div className="flex gap-4">
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-6 py-4 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-400 text-white placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all"
                >
                  Join Waitlist
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Early access for Nitro Demo Day (March 2026)
              </p>
            </form>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-20">
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-3">
              <div className="text-2xl">🔐</div>
              <h3 className="text-xl font-semibold">Security-First</h3>
              <p className="text-gray-400 text-sm">
                Multi-sig wallets, spending limits, MEV protection, transaction
                simulation before every tx
              </p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-3">
              <div className="text-2xl">⚡</div>
              <h3 className="text-xl font-semibold">Monad-Native</h3>
              <p className="text-gray-400 text-sm">
                Parallel transaction submission, local nonce tracking,
                optimized for 10K TPS throughput
              </p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-3">
              <div className="text-2xl">🎯</div>
              <h3 className="text-xl font-semibold">Agent Teams</h3>
              <p className="text-gray-400 text-sm">
                Specialized roles (monitor, decide, execute, verify) with
                deterministic workflows and retry logic
              </p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="pt-20 space-y-4">
            <p className="text-sm text-gray-400 uppercase tracking-wider">
              Applying to
            </p>
            <div className="flex items-center justify-center gap-8 text-gray-400">
              <span className="text-lg font-semibold">Nitro Accelerator</span>
              <span className="text-sm">•</span>
              <span className="text-sm">Backed by Paradigm, Dragonfly, Electric Capital</span>
            </div>
            <div className="pt-4">
              <a
                href="https://github.com/gabchess/agenthub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
          <p>Built for Monad AI Blueprint | Demo Day March 2026</p>
        </div>
      </div>
    </div>
  );
}
