import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-white mb-6">
            AMD System
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            Advanced Answering Machine Detection with Multi-Strategy Support
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Link
              href="/dial"
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className="text-4xl mb-4">📞</div>
              <h2 className="text-2xl font-bold text-white mb-2">Make a Call</h2>
              <p className="text-gray-300">
                Place outbound calls with AMD detection
              </p>
            </Link>

            <Link
              href="/history"
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-white mb-2">Call History</h2>
              <p className="text-gray-300">
                View analytics and call logs
              </p>
            </Link>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Detection Strategies</h3>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-bold text-white mb-2">🔷 Twilio Native</h4>
                <p className="text-sm text-gray-300">Built-in AMD with ~90% accuracy</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-bold text-white mb-2">🔶 Jambonz SIP</h4>
                <p className="text-sm text-gray-300">SIP-based detection ~93% accuracy</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-bold text-white mb-2">🔸 HuggingFace ML</h4>
                <p className="text-sm text-gray-300">AI-powered ~95% accuracy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
