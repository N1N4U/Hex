package docker

import (
	"context"
	"fmt"
	"io"
	"os/exec"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

type CreateContainerRequest struct {
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	Ports   map[string]string `json:"ports"` // map[HostPort]ContainerPort
	Env     []string          `json:"env"`
	Command []string          `json:"command"`
}

func (c *Client) CreateContainer(ctx context.Context, req CreateContainerRequest) (string, error) {
	// Pull the image first if it doesn't exist locally
	reader, err := c.api.ImagePull(ctx, req.Image, types.ImagePullOptions{})
	if err == nil {
		// Wait for pull to complete
		io.Copy(io.Discard, reader)
		reader.Close()
	}

	portMap := nat.PortMap{}
	exposedPorts := nat.PortSet{}
	for hostPort, containerPort := range req.Ports {
		port, err := nat.NewPort("tcp", containerPort)
		if err != nil {
			continue
		}
		exposedPorts[port] = struct{}{}
		portMap[port] = []nat.PortBinding{
			{
				HostIP:   "0.0.0.0",
				HostPort: hostPort,
			},
		}

		// Automatically open firewall port
		exec.Command("ufw", "allow", fmt.Sprintf("%s/tcp", hostPort)).Run()
	}

	config := &container.Config{
		Image:        req.Image,
		Env:          req.Env,
		Cmd:          req.Command,
		ExposedPorts: exposedPorts,
		Tty:          true,
	}

	hostConfig := &container.HostConfig{
		PortBindings: portMap,
		RestartPolicy: container.RestartPolicy{
			Name: "unless-stopped",
		},
	}

	resp, err := c.api.ContainerCreate(ctx, config, hostConfig, &network.NetworkingConfig{}, &v1.Platform{}, req.Name)
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	if err := c.api.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{}); err != nil {
		return resp.ID, fmt.Errorf("failed to start container: %w", err)
	}

	return resp.ID, nil
}

func (c *Client) ContainerAction(ctx context.Context, id, action string) error {
	switch action {
	case "start":
		return c.api.ContainerStart(ctx, id, types.ContainerStartOptions{})
	case "stop":
		timeout := int(10)
		return c.api.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout})
	case "restart":
		timeout := int(10)
		return c.api.ContainerRestart(ctx, id, container.StopOptions{Timeout: &timeout})
	case "kill":
		return c.api.ContainerKill(ctx, id, "SIGKILL")
	case "delete":
		err := c.api.ContainerStop(ctx, id, container.StopOptions{})
		if err != nil {
			// ignore stop error
		}
		return c.api.ContainerRemove(ctx, id, types.ContainerRemoveOptions{Force: true})
	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}

func (c *Client) GetContainerLogs(ctx context.Context, id string) (io.ReadCloser, error) {
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Tail:       "100",
		Timestamps: true,
	}
	return c.api.ContainerLogs(ctx, id, options)
}
