import React, { useRef } from 'react';
import { Camera, Upload, Sparkles, X, Layers, Image as ImageIcon } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void; // "Explore the app first" or close X
  onLivePicture: () => void; // "Click Live Picture"
  onUploadPicture: (files: FileList) => void; // "Upload Picture"
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onLivePicture,
  onUploadPicture
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadPicture(e.target.files);
      onClose();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2D]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Hidden file input for direct upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="bg-white border border-[#E8E6DF] rounded-3xl max-w-md w-full p-6 sm:p-8 text-[#2D2D2D] shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Subtle Decorative Background Element */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FFF5F5] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#FFF9E6] rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#E8E6DF] text-[#666666] hover:text-[#2D2D2D] flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo / Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#FFF5F5] border border-[#FF6B6B]/20 text-[#FF6B6B] flex items-center justify-center shadow-sm mb-4">
          <Camera className="w-7 h-7" />
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-black tracking-tight text-[#2D2D2D] font-sans">
          Welcome to <span className="text-[#FF6B6B]">STRIPLY</span>
        </h2>
        <p className="text-xs text-[#666666] mt-2 max-w-xs leading-relaxed font-medium">
          Create aesthetic vintage photobooth strips in seconds. How would you like to start?
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3 mt-6">
          {/* Button 1: Click Live Picture */}
          <button
            onClick={() => {
              onClose();
              onLivePicture();
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#FF6B6B] hover:bg-[#ff5252] active:scale-[0.98] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>Click Live Picture</span>
          </button>

          {/* Button 2: Upload Picture */}
          <button
            onClick={handleUploadClick}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#FAF9F6] hover:bg-[#F0EEE9] active:scale-[0.98] text-[#2D2D2D] border border-[#E8E6DF] font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#FF6B6B]" />
            <span>Upload Picture</span>
          </button>
        </div>

        {/* Bottom Link: Explore the app first */}
        <div className="mt-6 pt-2">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#666666] hover:text-[#FF6B6B] transition-colors underline underline-offset-4 cursor-pointer"
          >
            Explore the app first →
          </button>
        </div>
      </div>
    </div>
  );
};
