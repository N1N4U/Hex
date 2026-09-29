package api

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	hexcore "github.com/N1N4U/Hex/panel/core"
)

// CoreProxy proxies authenticated requests from node to the appropriate core.
type CoreProxy struct {
	manager *hexcore.Manager
}

func NewCoreProxy(manager *hexcore.Manager) *CoreProxy {
	return &CoreProxy{manager: manager}
}

// Proxy forwards any request to core, stripping /api/v1/core prefix.
func (p *CoreProxy) Proxy(w http.ResponseWriter, r *http.Request) {
	nodeID := r.Header.Get("X-Node-ID")
	if nodeID == "" {
		nodeID = r.URL.Query().Get("node_id")
	}

	client, err := p.manager.GetClient(nodeID)
	if err != nil || client == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"error":"No Core connected. Please add a Core in the Cores tab."}`))
		return
	}

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

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	resp, err := client.Do(ctx, r.Method, corePath, body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(fmt.Sprintf(`{"error":"Core unreachable: %s"}`, err.Error())))
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