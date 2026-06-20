// True if a string looks like an image URL/path (so Match columns, etc. can render
// it as a picture). Plain text labels like "Tokyo" stay text. Audio is excluded.
export function isImageUrl(s) {
  return (
    typeof s === 'string' &&
    (/^https?:\/\//i.test(s) || s.startsWith('/') || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(s)) &&
    !/\.(mp3|wav|ogg|m4a|flac)$/i.test(s)
  );
}
