# Use Node.js bullseye as base image
FROM node:22-slim

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends git

# Install latest npm
RUN npm install -g npm@latest

WORKDIR /workspace