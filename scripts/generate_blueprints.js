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
    
    // Don't overwrite if it already exists, unless we want to
    // Actually, for nodejs and mongodb we update them to have all versions below
    if (fs.existsSync(filePath) && name !== 'node' && name !== 'mongodb') {
        continue;
    }

    let defaultVersion = "latest";
    let options = [
      { id: `${name}:latest`, name: `${capitalize(name)} Latest`, dockerImage: `${name}:latest` }
    ];

    if (name === 'node') {
      defaultVersion = "node:22";
      options = [
        { id: "node:18", name: "Node.js 18", dockerImage: "node:18-alpine" },
        { id: "node:20", name: "Node.js 20", dockerImage: "node:20-alpine" },
        { id: "node:22", name: "Node.js 22", dockerImage: "node:22-alpine" },
        { id: "node:23", name: "Node.js 23", dockerImage: "node:23-alpine" }
      ];
    } else if (name === 'mongodb') {
      defaultVersion = "mongo:7";
      options = [
        { id: "mongo:5", name: "MongoDB 5.0", dockerImage: "mongo:5" },
        { id: "mongo:6", name: "MongoDB 6.0", dockerImage: "mongo:6" },
        { id: "mongo:7", name: "MongoDB 7.0", dockerImage: "mongo:7" },
        { id: "mongo:8", name: "MongoDB 8.0", dockerImage: "mongo:8" }
      ];
    }

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
    console.log(`Created blueprint: ${category}/${name}.json`);
  }
}
console.log("Finished generating blueprints.");
