#!/bin/bash
# Start all services for the WhatsApp Web clone

cd /home/z/my-project

# Start Socket.io chat service on port 3004
cd /home/z/my-project/mini-services/chat-service
nohup bun index.ts > /home/z/my-project/chat-service.log 2>&1 &
CHAT_PID=$!
echo "Chat service PID: $CHAT_PID"

# Start Next.js dev server on port 3000
cd /home/z/my-project
nohup node node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# Save PIDs for later cleanup
echo "$CHAT_PID $NEXT_PID" > /home/z/my-project/.pids

echo "All services started!"
echo "Next.js: http://localhost:3000"
echo "Chat Service: ws://localhost:3004"
