package api

import (
	"context"
	"log"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/gorilla/websocket"
	hexcore "github.com/N1N4U/Hex/panel/core"
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

// WSProxy proxies WebSocket connections between browser and core.
type WSProxy struct {
	client *hexcore.Client
}

func NewWSProxy(client *hexcore.Client) *WSProxy {
	return &WSProxy{client: client}
}

// ProxyWS upgrades client connection to WS, then dials core and bridges.
func (p *WSProxy) ProxyWS(w http.ResponseWriter, r *http.Request) {
	clientConn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade failed: %v", err)
		return
	}
	defer clientConn.Close()

	coreBase := p.client.BaseURL()
	coreURLParsed, err := url.Parse(coreBase)
	if err != nil {
		log.Printf("[ws] invalid core base URL: %v", err)
		return
	}
	switch coreURLParsed.Scheme {
	case "http":
		coreURLParsed.Scheme = "ws"
	case "https":
		coreURLParsed.Scheme = "wss"
	}
	coreURLParsed.Path = "/ws"
	coreURLParsed.RawQuery = r.URL.RawQuery

	var coreConn *websocket.Conn
	if p.client.Mode() == hexcore.ModeUnixSocket {
		socketPath := p.client.SocketPath()
		dialer := websocket.Dialer{
			NetDialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
			},
			HandshakeTimeout: 10 * time.Second,
		}
		coreURLParsed.Host = "hex-core"
		coreURLParsed.Scheme = "ws"
		coreConn, _, err = dialer.Dial(coreURLParsed.String(), nil)
	} else {
		hdr := http.Header{}
		if jwt := p.client.JWT(); jwt != "" {
			hdr.Set("Authorization", "Bearer "+jwt)
		}
		coreConn, _, err = websocket.DefaultDialer.Dial(coreURLParsed.String(), hdr)
	}
	if err != nil {
		log.Printf("[ws] core dial failed: %v", err)
		return
	}
	defer coreConn.Close()

	errc := make(chan error, 2)
	go bridge(clientConn, coreConn, errc)
	go bridge(coreConn, clientConn, errc)
	<-errc
}

func bridge(dst, src *websocket.Conn, errc chan<- error) {
	for {
		msgType, msg, err := src.ReadMessage()
		if err != nil {
			errc <- err
			return
		}
		if err := dst.WriteMessage(msgType, msg); err != nil {
			errc <- err
			return
		}
	}
}
