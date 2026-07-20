import { useState, type ImgHTMLAttributes } from 'react';

const LANDING_FALLBACK_IMAGE = '/images/landing/landing-fallback-v2.jpg';

type LandingImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError'>;

export function LandingImage({ src, alt, ...props }: LandingImageProps) {
  const [imageSource, setImageSource] = useState(src);

  return (
    <img
      {...props}
      src={imageSource}
      alt={alt}
      onError={() => {
        if (imageSource !== LANDING_FALLBACK_IMAGE) {
          setImageSource(LANDING_FALLBACK_IMAGE);
        }
      }}
    />
  );
}
