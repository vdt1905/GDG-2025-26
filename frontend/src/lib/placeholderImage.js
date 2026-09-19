// Inline fallback for <img> when a patient/report has no image, or when a
// Cloudinary URL fails to load.
//
// This used to point at "/placeholder.png", which was never added to public/ —
// every image-less report fired a 404. A data URI ships with the bundle, so it
// cannot 404 and costs no request.
const PLACEHOLDER_IMAGE =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img" aria-label="No image available">
  <rect width="400" height="400" fill="#f1f5f9"/>
  <g fill="none" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <rect x="110" y="128" width="180" height="144" rx="16"/>
    <path d="M110 232l46-44 38 34 32-28 44 38"/>
  </g>
  <circle cx="168" cy="172" r="14" fill="#cbd5e1"/>
  <text x="200" y="312" text-anchor="middle" font-family="system-ui, sans-serif" font-size="22" fill="#94a3b8">No image</text>
</svg>`
    );

// Use as: onError={onImageError}
export const onImageError = (e) => {
    if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
        e.currentTarget.src = PLACEHOLDER_IMAGE;
    }
};

export default PLACEHOLDER_IMAGE;
