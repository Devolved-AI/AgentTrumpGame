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
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
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