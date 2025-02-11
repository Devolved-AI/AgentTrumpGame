import { useEffect, useRef } from "react";

export function TrumpAnimation() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("Error playing video:", error);
      });
    }
  }, []);

  return (
    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-contain"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
      >
        <source src="/donald-trump-icegif.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}