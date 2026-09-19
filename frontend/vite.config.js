import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    headers: {
      // Firebase's signInWithPopup polls popup.closed to detect a cancelled
      // sign-in. Under the default COOP the browser severs that handle and logs
      // "Cross-Origin-Opener-Policy policy would block the window.closed call".
      // same-origin-allow-popups keeps the opener relationship for the popup.
      // Mirrored for production in vercel.json.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
