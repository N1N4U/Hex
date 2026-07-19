package docker

import (
	"context"
	"github.com/docker/docker/api/types/volume"
)

// ListVolumes returns all Docker volumes
func (c *Client) ListVolumes() ([]*volume.Volume, error) {
	resp, err := c.api.VolumeList(context.Background(), volume.ListOptions{})
	if err != nil {
		return nil, err
	}
	return resp.Volumes, nil
}

// CreateVolume creates a new Docker volume
func (c *Client) CreateVolume(name string) (volume.Volume, error) {
	return c.api.VolumeCreate(context.Background(), volume.CreateOptions{
		Name: name,
	})
}

// DeleteVolume removes a Docker volume
func (c *Client) DeleteVolume(name string) error {
	return c.api.VolumeRemove(context.Background(), name, false)
}
