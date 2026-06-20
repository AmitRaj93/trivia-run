'use client';

import { isImageUrl } from '../lib/media.js';

// Renders a single Match column entry as an image or text, depending on the value.
// Images use object-fit:contain so the whole image fits the fixed cell (no cropping
// — these can carry info), keeping aspect ratio and padding the leftover space.
export default function MatchEntry({ value, imgStyle, textStyle }) {
  if (isImageUrl(value)) {
    return (
      <img
        src={value}
        alt=""
        style={{
          borderRadius: 8,
          objectFit: 'contain',
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          display: 'block',
          ...imgStyle,
        }}
      />
    );
  }
  return <span style={textStyle}>{value}</span>;
}
