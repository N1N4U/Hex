package system

import (
	"encoding/json"
	"os/exec"
)

// DiskPartition represents a parsed lsblk output
type DiskPartition struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Size       string `json:"size"`
	Mountpoint string `json:"mountpoint"`
}

// GetPartitions runs lsblk and returns JSON
func GetPartitions() ([]DiskPartition, error) {
	out, err := exec.Command("lsblk", "-J", "-o", "NAME,TYPE,SIZE,MOUNTPOINT").Output()
	if err != nil {
		return nil, err
	}
	
	var result struct {
		BlockDevices []DiskPartition `json:"blockdevices"`
	}
	if err := json.Unmarshal(out, &result); err != nil {
		return nil, err
	}
	return result.BlockDevices, nil
}

// GetDiskUsage runs df -h
func GetDiskUsage() (string, error) {
	out, err := exec.Command("df", "-h").Output()
	return string(out), err
}
