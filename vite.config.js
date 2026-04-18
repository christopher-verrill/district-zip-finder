import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change BASE to '/your-repo-name/' if deploying to a GitHub project page
// e.g. base: '/district-zip-finder/'
// Leave as '/' if deploying to a custom domain or user/org page (username.github.io)
export default defineConfig({
  plugins: [react()],
  base: './',
})
