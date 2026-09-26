package audit

import (
	"log"
	"net/http"
)

// Event logs a user action. In future this will write to a database table.
func Event(userID, action, detail string, r *http.Request) {
	ip := r.RemoteAddr
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ip = xff
	}
	log.Printf("[AUDIT] user=%s action=%s detail=%q ip=%s", userID, action, detail, ip)
}
