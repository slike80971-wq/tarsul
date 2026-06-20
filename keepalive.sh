#!/bin/bash
cd /home/z/my-project
while true; do
  DATABASE_URL="file:./db/custom.db" npx next dev -p 3000 1>/tmp/next-out.log 2>/tmp/next-err.log
  echo "Server died, restarting in 1s..." >> /tmp/next-out.log
  sleep 1
done
