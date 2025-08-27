import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}", "./src/providers/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [require("@tailwindcss/forms")],
  darkMode: ["class", '[data-theme="dark"]'],
};
export default config;
