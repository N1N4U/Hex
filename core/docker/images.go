package docker

import (
	"context"
	"io"
	"github.com/docker/docker/api/types"
)

// ListImages returns all Docker images
func (c *Client) ListImages() ([]types.ImageSummary, error) {
	return c.api.ImageList(context.Background(), types.ImageListOptions{All: true})
}

// PullImage pulls a Docker image from a registry
func (c *Client) PullImage(imageName string) (io.ReadCloser, error) {
	return c.api.ImagePull(context.Background(), imageName, types.ImagePullOptions{})
}

// DeleteImage removes a Docker image
func (c *Client) DeleteImage(imageID string) error {
	_, err := c.api.ImageRemove(context.Background(), imageID, types.ImageRemoveOptions{
		Force:         true,
		PruneChildren: true,
	})
	return err
}

// InspectImage returns detailed information about an image
func (c *Client) InspectImage(imageID string) (types.ImageInspect, error) {
	resp, _, err := c.api.ImageInspectWithRaw(context.Background(), imageID)
	return resp, err
}
