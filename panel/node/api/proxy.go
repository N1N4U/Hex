package api

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	hexcore "github.com/N1N4U/Hex/panel/core"
)

// CoreProxy proxies authenticated requests from node to core.
type CoreProxy struct {
	client *hexcore.Client
}

func NewCoreProxy(client *hexcore.Client) *CoreProxy {
	return &CoreProxy{client: client}
}

// Proxy forwards any request to core, stripping /api/v1/core prefix.
func (p *CoreProxy) Proxy(w http.ResponseWriter, r *http.Request) {
	corePath := strings.TrimPrefix(r.URL.Path, "/api/v1/core")
	if corePath == "" {
		corePath = "/"
	}
	if r.URL.RawQuery != "" {
		corePath += "?" + r.URL.RawQuery
	}

	var body io.Reader
	if r.Method != http.MethodGet && r.Body != nil {
		body = r.Body
		defer r.Body.Close()
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	resp, err := p.client.Do(ctx, r.Method, corePath, body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error":"Core unreachable"}`))
		return
	}
	defer resp.Body.Close()

	for k, vv := range resp.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}