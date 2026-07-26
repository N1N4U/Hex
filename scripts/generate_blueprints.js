const fs = require('fs');
const path = require('path');

const blueprintData = {
  "applications": [
    "node", "python", "java", "go", "rust", "php", "dotnet", "bun", "deno",
    "ruby", "perl", "lua", "elixir", "erlang", "kotlin", "scala", "groovy",
    "clojure", "swift", "dart", "crystal", "zig", "c", "cpp", "shell"
  ],
  "databases": [
    "mongodb", "mysql", "mariadb", "postgresql", "redis", "valkey", "sqlite",
    "clickhouse", "influxdb", "neo4j", "couchdb", "cassandra", "arangodb",
    "surrealdb", "elasticsearch", "opensearch", "meilisearch", "typesense", "qdrant"
  ],
  "storage": [
    "minio", "seaweedfs", "garage", "ceph", "glusterfs", "nextcloud",
    "owncloud", "seafile", "filebrowser", "sftpgo", "syncthing", "pydio",
    "filerun", "immich", "photoprism", "paperlessngx"
  ],
  "game-servers": [
    "paper", "fabric", "terraria", "palworld", "rust", "ark", "valheim",
    "cs2", "factorio", "unturned", "velocity", "fivem", "project-zomboid"
  ],
  "ai": [
    "ollama", "open-webui", "comfyui", "automatic1111", "invokeai",
    "flowise", "langflow", "anythingllm", "litellm", "openhands", "vllm"
  ],
  "media": [
    "jellyfin", "plex", "emby", "navidrome", "audiobookshelf", "sonarr",
    "radarr", "lidarr", "readarr", "bazarr", "jellyseerr"
  ],
  "automation": [
    "n8n", "node-red", "activepieces", "temporal", "windmill", "home-assistant"
  ],
  "security": [
    "vaultwarden", "authentik", "authelia", "keycloak", "crowdsec", "wazuh"
  ]
};

const versionMap = {
  "node": ["18", "20", "22", "23"],
  "python": ["3.9", "3.10", "3.11", "3.12", "3.13"],
  "java": ["8", "11", "17", "21"],
  "go": ["1.20", "1.21", "1.22", "1.23"],
  "rust": ["1.75", "1.76", "1.77", "1.78", "latest"],
  "php": ["8.1", "8.2", "8.3", "latest"],
  "dotnet": ["6.0", "7.0", "8.0"],
  "bun": ["1.0", "1.1", "latest"],
  "deno": ["1.40", "1.41", "latest"],
  "ruby": ["3.1", "3.2", "3.3"],
  "mongodb": ["5.0", "6.0", "7.0", "8.0"],
  "mysql": ["5.7", "8.0", "8.1"],
  "mariadb": ["10.6", "10.11", "11.2"],
  "postgresql": ["14", "15", "16", "17"],
  "redis": ["6.2", "7.0", "7.2", "latest"],
  "sqlite": ["3", "latest"],
  "elasticsearch": ["7.17", "8.10", "8.12", "latest"],
  "minio": ["RELEASE.2023", "RELEASE.2024", "latest"],
  "nextcloud": ["27", "28", "29", "latest"],
  "paper": ["1.19.4", "1.20.4", "1.21", "latest"],
  "fabric": ["1.19.4", "1.20.4", "1.21", "latest"],
  "ollama": ["0.1", "0.2", "0.3", "latest"],
  "jellyfin": ["10.8", "10.9", "latest"],
  "plex": ["latest"],
  "n8n": ["1.0", "1.20", "latest"],
  "vaultwarden": ["1.30", "1.31", "latest"]
};

const baseDir = path.join(__dirname, '..', 'blueprints');

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

// Generate all files
for (const [category, names] of Object.entries(blueprintData)) {
  const catDir = path.join(baseDir, category);
  
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }

  for (const name of names) {
    const filePath = path.join(catDir, `${name}.json`);

    let versions = versionMap[name] || ["latest"];
    let defaultVersion = `${name}:${versions[versions.length - 1]}`;
    
    let options = versions.map(v => {
      let vSuffix = v === "latest" ? "latest" : v;
      return {
        id: `${name}:${vSuffix}`,
        name: `${capitalize(name)} ${v}`,
        dockerImage: `${name}:${vSuffix}`
      };
    });

    const template = {
      "schemaVersion": 1,
      "id": name,
      "name": capitalize(name),
      "description": `Deploy ${capitalize(name)} using Docker.`,
      "version": "1.0.0",
      "author": "Hex Team",
      "homepage": "https://github.com/N1N4U/blueprints",
      "category": capitalize(category),
      "iconUrl": `https://raw.githubusercontent.com/N1N4U/blueprints/main/icons/${name}.png`,
      "runtime": {
        "default": defaultVersion,
        "options": options
      },
      "docker": {
        "image": options[0].dockerImage,
        "imagePullPolicy": "always",
        "workingDirectory": "/home/container",
        "entrypoint": "",
        "startupCommand": "",
        "restartPolicy": "unless-stopped",
        "networkMode": "bridge",
        "privileged": false,
        "readOnlyRootFilesystem": false,
        "healthcheck": {
          "enabled": false,
          "command": "",
          "interval": "30s",
          "timeout": "5s",
          "retries": 3
        }
      },
      "git": {
        "enabled": false,
        "repository": "",
        "branch": "",
        "autoUpdate": false,
        "username": "",
        "accessToken": "",
        "clonePath": ""
      },
      "startup": {
        "startupFile": "",
        "packageManager": "",
        "packageFile": "",
        "lockFile": "",
        "installCommand": "",
        "buildCommand": "",
        "startCommand": "",
        "stopCommand": "",
        "additionalPackages": [],
        "removeNodeModules": false
      },
      "storage": {
        "persistent": true,
        "mounts": [
          {
            "containerPath": "/home/container",
            "type": "volume"
          }
        ]
      },
      "networking": {
        "ports": [
          {
            "name": "Application",
            "containerPort": [3000],
            "protocol": "tcp"
          }
        ]
      },
      "resources": {
        "memory": {
          "default": 1024,
          "minimum": 512,
          "maximum": 8192
        },
        "cpu": {
          "default": 100,
          "minimum": 10,
          "maximum": 400
        },
        "disk": {
          "default": 2048
        },
        "swap": {
          "default": 0
        }
      },
      "variables": [],
      "scripts": {
        "install": "",
        "update": "",
        "backup": "",
        "restore": ""
      },
      "metadata": {
        "featured": false,
        "official": true,
        "verified": true,
        "tags": [name, category]
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    console.log(`Updated blueprint: ${category}/${name}.json`);
  }
}
console.log("Finished updating blueprints with multi-versions.");
