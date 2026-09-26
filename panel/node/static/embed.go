package static

import "embed"

// Dist holds the built Svelte site output.
// Build the site first: cd panel/site && npm run build
//
//go:embed dist
var Dist embed.FS