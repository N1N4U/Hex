package docker

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

type Client struct {
	api *client.Client
}

type ContainerInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Image  string `json:"image"`
	State  string `json:"state"`
	Status string `json:"status"`
}

func NewClient() (*Client, error) {
	apiClient, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to initialize docker client: %w", err)
	}
	return &Client{api: apiClient}, nil
}

func (c *Client) ListContainers(ctx context.Context) ([]ContainerInfo, error) {
	containers, err := c.api.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var result []ContainerInfo
	for _, container := range containers {
		name := ""
		if len(container.Names) > 0 {
			name = container.Names[0]
		}
		result = append(result, ContainerInfo{
			ID:     container.ID,
			Name:   name,
			Image:  container.Image,
			State:  container.State,
			Status: container.Status,
		})
	}

	return result, nil
}
