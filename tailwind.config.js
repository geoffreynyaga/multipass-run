/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/webview/**/*.{ts,tsx,js,jsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				'ubuntu': ['Ubuntu', 'system-ui', '-apple-system', 'sans-serif'],
				'fedora': ['Red Hat Display', 'Overpass', 'system-ui', '-apple-system', 'sans-serif'],
				'debian': ['Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
				'default': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
				'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
			},
		},
	},
	plugins: [],
};
