package docker

import (
	"context"
	"github.com/docker/docker/api/types"
)

// ListNetworks returns all Docker networks
func (c *Client) ListNetworks() ([]types.NetworkResource, error) {
	return c.api.NetworkList(context.Background(), types.NetworkListOptions{})
}

// CreateNetwork creates a new Docker network
func (c *Client) CreateNetwork(name string, driver string) (string, error) {
	resp, err := c.api.NetworkCreate(context.Background(), name, types.NetworkCreate{
		Driver: driver,
	})
	if err != nil {
		return "", err
	}
	return resp.ID, nil
}

// DeleteNetwork removes a Docker network
func (c *Client) DeleteNetwork(networkID string) error {
	return c.api.NetworkRemove(context.Background(), networkID)
}

// ConnectNetwork connects a container to a network
func (c *Client) ConnectNetwork(networkID, containerID string) error {
	return c.api.NetworkConnect(context.Background(), networkID, containerID, nil)
}

// DisconnectNetwork disconnects a container from a network
func (c *Client) DisconnectNetwork(networkID, containerID string) error {
	return c.api.NetworkDisconnect(context.Background(), networkID, containerID, false)
}
