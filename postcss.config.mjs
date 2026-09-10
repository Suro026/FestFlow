/** @type {import('postcss-load-config').Config} */
// Kept in step with postcss.config.js. This file previously declared the
// Tailwind v4 plugin ('@tailwindcss/postcss'), which is not a dependency of
// this project - the build only survived because postcss-load-config happens
// to find postcss.config.js first. One of these two files can be deleted.
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
