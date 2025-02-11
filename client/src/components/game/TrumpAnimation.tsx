import { useEffect, useRef } from "react";

export function TrumpAnimation() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, []);

  return (
    <video
      ref={videoRef}
      className="w-64 h-64 object-cover rounded-lg shadow-lg"
      autoPlay
      loop
      muted
      playsInline
    >
      <source src="/donald-trump-icegif.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}
