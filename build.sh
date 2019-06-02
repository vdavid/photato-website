#!/usr/bin/env bash

export NODE_VERSION=8
export NODE_ENV=production

# Build client
cd client
npm ci
npm run build
cd ..

# Build server
cd server
npm ci
cd ..

# Build root
npm ci
npm start-both