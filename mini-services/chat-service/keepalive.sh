#!/bin/bash
cd /home/z/my-project/mini-services/chat-service
while true; do
  bun --hot index.ts 2>&1 | tee /tmp/chat-service.log
  echo "Chat service died, restarting in 1s..." >> /tmp/chat-service.log
  sleep 1
done
