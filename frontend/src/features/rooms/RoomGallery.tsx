import React, { useState } from 'react'
import { Maximize2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Lightbox } from '@/components/ui/Lightbox'

interface RoomGalleryProps {
  images: string[]
  title: string
}

export const RoomGallery: React.FC<RoomGalleryProps> = ({ images, title }) => {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (!images || images.length === 0) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIdx((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIdx((prev) => (prev + 1) % images.length)
  }

  return (
    <div className="space-y-3">
      {/* Main Big Photo */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 group shadow-md select-none">
        <img
          src={images[selectedIdx]}
          alt={`${title} - Ảnh ${selectedIdx + 1}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102 cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-xs shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh kế tiếp"
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-xs shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Expand / View Fullscreen Button */}
        <button
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg hover:scale-105 cursor-pointer"
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
        <div
          className={`grid grid-cols-4 ${
            images.length > 4 ? 'sm:grid-cols-7' : 'sm:grid-cols-4'
          } gap-2 sm:gap-2.5`}
        >
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
