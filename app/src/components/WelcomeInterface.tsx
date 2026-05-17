import { useState } from 'react'
import { Upload, Camera, Globe, Cube, ArrowRight, Play } from '@phosphor-icons/react'
import { AppButton } from './AppButton'

interface Props {
  onStartUpload: () => void
  recentRooms?: Array<{
    slug: string
    name: string
    thumbnail?: string
    createdAt: Date
  }>
  onOpenRoom?: (slug: string) => void
}

export function WelcomeInterface({ onStartUpload, recentRooms = [], onOpenRoom }: Props) {
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white/90 rounded-sm" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              snaproom
            </h1>
          </div>
          <p className="text-xl text-white/80 mb-4 font-medium">
            Turn photos into walkable 3D rooms
          </p>
          <p className="text-white/60 max-w-2xl mx-auto text-lg leading-relaxed">
            Upload photos of your room and we'll create a 3D world you can explore in your browser.
          </p>
        </div>

        {/* Main Action */}
        <div className="text-center mb-16">
          <AppButton
            onClick={onStartUpload}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-4 text-lg font-semibold inline-flex items-center gap-3 rounded-xl shadow-lg shadow-blue-500/25"
          >
            <Upload size={20} />
            Create 3D Room
            <ArrowRight size={20} />
          </AppButton>
          <p className="text-white/60 mt-6 flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Free
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              No signup required
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
              ~10 minutes
            </span>
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center group">
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all duration-300">
              <Camera size={24} className="text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">Take Photos</h3>
            <p className="text-white/60 leading-relaxed">
              Multiple angles of your room or floorplans
            </p>
          </div>
          <div className="text-center group">
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300">
              <Cube size={24} className="text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">AI Processing</h3>
            <p className="text-white/60 leading-relaxed">
              Reconstruct your space in full 3D
            </p>
          </div>
          <div className="text-center group">
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl flex items-center justify-center group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all duration-300">
              <Globe size={24} className="text-green-400" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">Explore</h3>
            <p className="text-white/60 leading-relaxed">
              Walk through your room in the browser
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-center mb-16">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="text-white/60 hover:text-white inline-flex items-center gap-2"
          >
            <Play size={16} />
            {showDemo ? 'Hide' : 'How it works'}
          </button>
          
          {showDemo && (
            <div className="mt-8 max-w-2xl mx-auto text-left">
              <div className="bg-white/5 rounded-lg p-6 space-y-4">
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                  <div>
                    <h4 className="font-medium mb-1">Upload Photos</h4>
                    <p className="text-sm text-white/60">Take pictures from different angles of your room</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                  <div>
                    <h4 className="font-medium mb-1">AI Processing</h4>
                    <p className="text-sm text-white/60">Our AI builds the 3D space and objects</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                  <div>
                    <h4 className="font-medium mb-1">Explore</h4>
                    <p className="text-sm text-white/60">Walk around your room and share with others</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <div>
            <h2 className="text-xl font-medium mb-6">Your Rooms</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentRooms.map((room) => (
                <button
                  key={room.slug}
                  onClick={() => onOpenRoom?.(room.slug)}
                  className="text-left bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors"
                >
                  <div className="aspect-video bg-white/5 rounded mb-3 overflow-hidden">
                    {room.thumbnail ? (
                      <img
                        src={room.thumbnail}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Globe size={32} className="text-white/40" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium mb-1">{room.name}</h3>
                  <p className="text-sm text-white/60">
                    {room.createdAt.toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-white/10">
          <p className="text-white/40 text-sm">
            Powered by AI • Made for creators and dreamers
          </p>
          {import.meta.env.DEV && (
            <p className="mt-2">
              <a 
                href="?legacy=true" 
                className="text-white/30 hover:text-white/50 underline text-xs"
              >
                Developer Mode
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
