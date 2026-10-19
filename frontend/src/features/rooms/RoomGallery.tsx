import React, { useState } from 'react'
import { Maximize2, Image as ImageIcon } from 'lucide-react'
import { Lightbox } from '@/components/ui/Lightbox'

interface RoomGalleryProps {
  images: string[]
  title: string
}

export const RoomGallery: React.FC<RoomGalleryProps> = ({ images, title }) => {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (!images || images.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Main Big Photo */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 group shadow-md">
        <img
          src={images[selectedIdx]}
          alt={`${title} - Ảnh ${selectedIdx + 1}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102 cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Expand / View Fullscreen Button */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg hover:scale-105"
        >
          <Maximize2 className="w-4 h-4 text-sky-400" />
          <span>Xem {images.length} ảnh thực tế</span>
        </button>

        {/* Photo Counter Tag */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>Ảnh {selectedIdx + 1} / {images.length}</span>
        </div>
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border-2 transition-all cursor-pointer ${
                selectedIdx === idx
                  ? 'border-sky-600 ring-2 ring-sky-200 ring-offset-1'
                  : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Lightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={images}
        currentIndex={selectedIdx}
        setCurrentIndex={setSelectedIdx}
        roomTitle={title}
      />
    </div>
  )
}
