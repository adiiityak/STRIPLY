import React, { useState } from 'react';
import { Share2, Copy, Check, X, Download, Sparkles, Send, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { StripConfiguration } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StripConfiguration;
  onExportPNG: () => Promise<string | null>; // Returns Data URL or triggers download
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  config,
  onExportPNG
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [sharingNative, setSharingNative] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Generate preview or image on modal open
  React.useEffect(() => {
    if (isOpen) {
      setLoadingPreview(true);
      onExportPNG()
        .then((url) => {
          if (url) setPreviewDataUrl(url);
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://striply.app';
  const shareText = `Check out my custom photobooth strip: "${config.captionText || 'Memories'}"! 📸✨ #StriplyPhotobooth`;

  // Native Web Share API
  const handleNativeShare = async () => {
    setSharingNative(true);
    try {
      if (previewDataUrl && navigator.share) {
        // Convert base64 dataUrl to File
        const res = await fetch(previewDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'striply-photobooth.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Striply Photo Strip',
            text: shareText,
            files: [file]
          });
        } else {
          await navigator.share({
            title: 'Striply Photo Strip',
            text: shareText,
            url: currentUrl
          });
        }
      } else if (navigator.share) {
        await navigator.share({
          title: 'Striply Photo Strip',
          text: shareText,
          url: currentUrl
        });
      } else {
        handleCopyLink();
      }
    } catch (err) {
      console.log('Share canceled or error:', err);
    } finally {
      setSharingNative(false);
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copy caption text
  const handleCopyCaption = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  // Copy image to clipboard
  const handleCopyImage = async () => {
    if (!previewDataUrl) return;
    try {
      const res = await fetch(previewDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
    } catch (err) {
      console.error('Copy image failed:', err);
      // Fallback
      handleCopyLink();
    }
  };

  // Social Share URLs
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${currentUrl}`)}`;
  const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(currentUrl)}&description=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2D]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E6DF] rounded-3xl max-w-lg w-full p-6 text-[#2D2D2D] shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E6DF]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF5F5] text-[#FF6B6B] flex items-center justify-center border border-[#FF6B6B]/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2D2D2D]">Share Photo Strip</h3>
              <p className="text-xs text-[#666666]">Directly post to socials or copy a share link</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6DF] text-[#666666] hover:text-[#2D2D2D] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Strip Image Preview Thumbnail */}
        <div className="mt-4 p-3 bg-[#FAF9F6] border border-[#E8E6DF] rounded-2xl flex items-center gap-4">
          <div className="w-16 h-24 bg-white rounded-xl border border-[#E8E6DF] overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
            {loadingPreview ? (
              <Sparkles className="w-5 h-5 text-[#FF6B6B] animate-spin" />
            ) : previewDataUrl ? (
              <img src={previewDataUrl} alt="Strip Thumbnail" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-[#AAAAAA]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-[#2D2D2D] truncate">
              {config.captionText || 'Photobooth Strip'}
            </h4>
            <p className="text-xs text-[#666666] truncate mt-0.5">
              {config.subCaptionText || 'Created with Striply'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleCopyImage}
                className="text-[11px] font-bold text-[#FF6B6B] bg-[#FFF5F5] hover:bg-[#FFE8E8] px-2.5 py-1 rounded-lg border border-[#FF6B6B]/20 transition-colors flex items-center gap-1"
              >
                {copiedImage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Native Mobile / System Share Button */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            disabled={sharingNative}
            className="mt-4 w-full py-3 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-full font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via System Share Sheet</span>
          </button>
        )}

        {/* Major Social Platforms Grid */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
            Direct Social Media
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Instagram */}
            <button
              onClick={() => {
                handleCopyCaption();
                if (previewDataUrl) {
                  const link = document.createElement('a');
                  link.download = 'striply-instagram-strip.png';
                  link.href = previewDataUrl;
                  link.click();
                }
                window.open('https://instagram.com', '_blank');
              }}
              className="p-3 bg-[#FAF9F6] hover:bg-[#FFF5F5] border border-[#E8E6DF] hover:border-[#FF6B6B]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 group transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#2D2D2D]">Instagram</span>
              <span className="text-[9px] text-[#999999]">Save & Post</span>
            </button>

            {/* Twitter / X */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#FAF9F6] hover:bg-[#FFF5F5] border border-[#E8E6DF] hover:border-[#FF6B6B]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 group transition-colors text-center"
            >
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-xs">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#2D2D2D]">Twitter / X</span>
              <span className="text-[9px] text-[#999999]">Post Tweet</span>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#FAF9F6] hover:bg-[#FFF5F5] border border-[#E8E6DF] hover:border-[#FF6B6B]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 group transition-colors text-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#2D2D2D]">Facebook</span>
              <span className="text-[9px] text-[#999999]">Share Feed</span>
            </a>

            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#FAF9F6] hover:bg-[#FFF5F5] border border-[#E8E6DF] hover:border-[#FF6B6B]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 group transition-colors text-center"
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.553 4.12 1.519 5.856L.069 23.361l5.632-1.477c1.674.914 3.593 1.439 5.631 1.439 6.646 0 12.031-5.385 12.031-12.031C23.363 5.385 17.978 0 12.031 0zm6.386 16.923c-.27.761-1.332 1.402-2.148 1.583-.56.124-1.292.223-3.754-.799-3.151-1.306-5.182-4.502-5.34-4.712-.158-.21-1.288-1.716-1.288-3.273 0-1.558.814-2.327 1.103-2.646.289-.319.631-.399.842-.399.21 0 .421.002.605.011.196.009.46-.075.722.553.27.646.918 2.247.997 2.408.079.161.132.35.026.562-.105.212-.158.344-.316.529-.158.185-.333.413-.475.555-.158.158-.323.33-.139.646.185.316.822 1.356 1.763 2.195 1.21 1.079 2.23 1.413 2.546 1.571.316.158.5.132.684-.079.185-.211.79-.921 1.001-1.238.21-.316.421-.263.711-.158.289.105 1.842.869 2.158 1.027.316.158.526.237.605.369.079.132.079.764-.191 1.525z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#2D2D2D]">WhatsApp</span>
              <span className="text-[9px] text-[#999999]">Send Chat</span>
            </a>
          </div>
        </div>

        {/* Share via Link Section */}
        <div className="mt-5 space-y-2 pt-3 border-t border-[#E8E6DF]">
          <label className="text-xs font-black uppercase tracking-widest text-[#AAAAAA] block">
            Direct Link & Caption
          </label>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#FAF9F6] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs font-mono text-[#2D2D2D] truncate">
              {currentUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-[#FAF9F6] hover:bg-[#FFF5F5] border border-[#E8E6DF] hover:border-[#FF6B6B] text-[#2D2D2D] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-[#FF6B6B]" />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between bg-[#FFF5F5] border border-[#FF6B6B]/20 rounded-2xl p-3 mt-2">
            <div className="text-xs text-[#2D2D2D] font-medium pr-2 line-clamp-1">
              "{shareText}"
            </div>
            <button
              onClick={handleCopyCaption}
              className="text-[11px] font-bold text-[#FF6B6B] hover:text-[#ff5252] flex items-center gap-1 shrink-0"
            >
              {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-[#E8E6DF] flex items-center justify-between text-xs">
          <p className="text-[11px] text-[#999999]">High resolution 300DPI export enabled</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#FAF9F6] hover:bg-[#E8E6DF] text-[#666666] font-bold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
