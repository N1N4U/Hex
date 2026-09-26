package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type entry struct {
	count  int
	window time.Time
}

var (
	limitMu sync.Mutex
	clients = make(map[string]*entry)
)

// RateLimit allows max requests per IP per window.
func RateLimit(max int, window time.Duration, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		limitMu.Lock()
		e, ok := clients[ip]
		if !ok || time.Since(e.window) > window {
			clients[ip] = &entry{count: 1, window: time.Now()}
			limitMu.Unlock()
			next(w, r)
			return
		}
		e.count++
		if e.count > max {
			limitMu.Unlock()
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		limitMu.Unlock()
		next(w, r)
	}
}
