import React from 'react';
import { Camera, ImagePlus } from 'lucide-react';

interface StartScreenProps {
  onTakeLivePicture: () => void;
  onUploadPhotos: (files: FileList) => void;
  onExploreApp: () => void;
}

/**
 * First thing a visitor sees. The camera is only requested once they choose it, so the
 * browser's permission prompt arrives with intent behind it rather than on page load.
 */
export const StartScreen: React.FC<StartScreenProps> = ({
  onTakeLivePicture,
  onUploadPhotos,
  onExploreApp
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files.length > 0) onUploadPhotos(files);
    // Reset so picking the same file again still fires a change event.
    event.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-screen-title"
      className="absolute inset-0 z-50 bg-[#FAF9F6] flex flex-col items-center justify-center px-6 py-10 text-center overflow-y-auto"
    >
      <div className="w-14 h-14 bg-[#FF6B6B] rounded-2xl flex items-center justify-center shadow-md transform -rotate-6 mb-5">
        <Camera className="w-7 h-7 text-white" />
      </div>

      <h1 id="start-screen-title" className="text-3xl font-black tracking-tighter text-[#FF6B6B]">
        STRIPLY
      </h1>
      <p className="mt-2 mb-8 text-sm text-[#666666] max-w-xs">
        Turn your memories into vintage photo booth strips. Start by snapping a few shots or
        picking photos you already have.
      </p>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onTakeLivePicture}
          className="w-full px-5 py-3.5 bg-[#FF6B6B] hover:bg-[#ff5252] text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          Click live picture
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-5 py-3.5 bg-white hover:bg-[#FFF5F5] text-[#FF6B6B] border-[1.5px] border-[#FF6B6B] rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <ImagePlus className="w-4 h-4" />
          Upload picture
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      <button
        onClick={onExploreApp}
        className="mt-6 text-xs font-semibold text-[#666666] hover:text-[#2D2D2D] underline underline-offset-4 decoration-[#E8E6DF] hover:decoration-[#666666] transition-colors cursor-pointer"
      >
        Explore the app first
      </button>
    </div>
  );
};
