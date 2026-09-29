package logger

import (
	"fmt"
	"os"
	"sync"
	"time"
)

var (
	mu            sync.Mutex
	showTimestamp = false
	useColor      = true
	debugToggle   = false
	debugCore     = true
)

// Init sets the logger options from config.
func Init(timestamp bool, color bool, debug bool, coreDebug bool) {
	mu.Lock()
	defer mu.Unlock()
	showTimestamp = timestamp
	useColor = color
	debugToggle = debug
	debugCore = coreDebug
}

func logMessage(tag, colorCode, format string, args ...interface{}) {
	mu.Lock()
	defer mu.Unlock()

	msg := fmt.Sprintf(format, args...)

	timePart := ""
	if showTimestamp {
		now := time.Now().Format("2006/01/02 15:04:05")
		if useColor {
			timePart = fmt.Sprintf("\033[33m%s\033[0m ", now)
		} else {
			timePart = fmt.Sprintf("%s ", now)
		}
	}

	tagPart := fmt.Sprintf("[%s]", tag)
	if useColor {
		tagPart = fmt.Sprintf("%s[%s]\033[0m", colorCode, tag)
	}

	fmt.Fprintf(os.Stdout, "%s%s :: %s\n", timePart, tagPart, msg)
}

// Core logs actions related to Hex Core nodes (in green).
func Core(format string, args ...interface{}) {
	logMessage("CORE", "\033[32m", format, args...)
}

// CoreDebug logs debug-level Core actions if debug toggle and core debug are enabled.
func CoreDebug(format string, args ...interface{}) {
	if !debugToggle || !debugCore {
		return
	}
	logMessage("CORE", "\033[32m", format, args...)
}

// Node logs actions related to the Node panel backend (in blue).
func Node(format string, args ...interface{}) {
	logMessage("NODE", "\033[34m", format, args...)
}

// NodeDebug logs debug-level Node actions if debug toggle is enabled.
func NodeDebug(format string, args ...interface{}) {
	if !debugToggle {
		return
	}
	logMessage("NODE", "\033[34m", format, args...)
}

// Site logs actions related to the Site / frontend client requests (in violet/magenta).
func Site(format string, args ...interface{}) {
	logMessage("SITE", "\033[35m", format, args...)
}

// SiteDebug logs debug-level Site actions if debug toggle is enabled.
func SiteDebug(format string, args ...interface{}) {
	if !debugToggle {
		return
	}
	logMessage("SITE", "\033[35m", format, args...)
}
