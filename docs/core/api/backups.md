# Advanced Backups API

The Hex Core exposes an API for full system and directory-level automated `tar.gz` backups.

## Backup Engine

- `POST /system/backups?action=create&target=<path>&name=<name>` - Compresses the target directory into `/var/lib/hex/backups/<name>_<timestamp>.tar.gz`.
- `POST /system/backups?action=restore&name=<backup-file>&target=<dest-dir>` - Extracts the backup archive to the destination directory.
