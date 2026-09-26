package static

import "embed"

// Dist holds the built Svelte site output.
// all: prefix is required so Go embeds folders starting with _ or . (like _app)
//
//go:embed all:dist
var Dist embed.FS
