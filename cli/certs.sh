#!/bin/bash
# Generate mTLS Certificates for Hex
# This creates a CA, a Server Cert (for Core), and a Client Cert (for Panel)

mkdir -p certs
cd certs

# 1. Generate CA
openssl req -new -x509 -days 3650 -keyout ca.key -out ca.crt -nodes -subj "/C=US/ST=State/L=City/O=Hex/CN=Hex Root CA"

# 2. Generate Server Certificate (Core)
openssl req -newkey rsa:2048 -nodes -keyout server.key -out server.csr -subj "/C=US/ST=State/L=City/O=Hex/CN=localhost"
openssl x509 -req -extfile <(printf "subjectAltName=IP:127.0.0.1,DNS:localhost") -days 3650 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

# 3. Generate Client Certificate (Panel)
openssl req -newkey rsa:2048 -nodes -keyout client.key -out client.csr -subj "/C=US/ST=State/L=City/O=Hex/CN=Hex Panel"
openssl x509 -req -days 3650 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt

echo "Certificates generated successfully in ./certs/"
