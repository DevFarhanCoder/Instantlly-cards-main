import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface StaticImageAdProps {
  bannerSrc: string;
  fullscreenSrc: string;
  alt?: string;
  /** link to open when the fullscreen ad CTA is tapped */
  ctaHref?: string;
  ctaLabel?: string;
}

const StaticImageAd = ({
  bannerSrc,
  fullscreenSrc,
  alt = "Sponsored",
  ctaHref,
  ctaLabel = "Learn More",
}: StaticImageAdProps) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      {/* ── Sticky Bottom Banner ── */}
      <div className="fixed bottom-[57px] left-0 right-0 z-40">
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 260,
            damping: 22,
          }}
          className="relative cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          {/* Ad label */}
          <span className="absolute top-1 left-1 z-10 text-[9px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
            Ad
          </span>

          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="absolute top-1 right-1 z-10 h-5 w-5 flex items-center justify-center rounded-full bg-black/40 text-white/80"
          >
            <X className="h-3 w-3" />
          </button>

          <img
            src={bannerSrc}
            alt={alt}
            className="w-full object-cover"
            style={{ maxHeight: 70 }}
          />
        </motion.div>
      </div>

      {/* ── Fullscreen Ad Modal ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black"
          >
            {/* Close */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Fullscreen image — scrollable if taller than screen */}
            <div className="flex-1 overflow-y-auto">
              <img
                src={fullscreenSrc}
                alt={alt}
                className="w-full object-contain"
              />
            </div>

            {/* CTA bar */}
            {ctaHref && (
              <div className="p-4 bg-black/80">
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-xl bg-yellow-400 text-black font-bold py-3 text-sm"
                  onClick={() => setExpanded(false)}
                >
                  {ctaLabel}
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StaticImageAd;
