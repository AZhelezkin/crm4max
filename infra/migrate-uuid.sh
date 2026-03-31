#!/usr/bin/env bash
# Deploy UUID migration + reseed on production
# Usage: SSH_KEY=~/.ssh/crm4max_deploy bash infra/migrate-uuid.sh

set -e

SSH_KEY="${SSH_KEY:-~/.ssh/crm4max_deploy}"
VM_HOST="${VM_HOST:-158.160.244.151}"
SSH="ssh -i $SSH_KEY ubuntu@$VM_HOST"
CONTAINER="crm4max-backend-1"

echo "=== 1. Copying new migration to container ==="
scp -i "$SSH_KEY" \
  backend/prisma/migrations/20260331000000_uuid_ids/migration.sql \
  ubuntu@${VM_HOST}:/tmp/20260331000000_uuid_ids.sql

$SSH "docker exec $CONTAINER mkdir -p /app/prisma/migrations/20260331000000_uuid_ids && \
  docker cp /tmp/20260331000000_uuid_ids.sql \
    $CONTAINER:/app/prisma/migrations/20260331000000_uuid_ids/migration.sql"

echo "=== 2. Applying migration ==="
$SSH "docker exec $CONTAINER npx prisma migrate deploy"

echo "=== 3. Truncating all tables (CASCADE) ==="
$SSH "docker exec $CONTAINER node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRawUnsafe(\`
  TRUNCATE TABLE reviews, payments, bookings, service_photos, services,
    categories, schedules, master_photos, clients, masters RESTART IDENTITY CASCADE
\`).then(() => { console.log('Truncated OK'); return prisma.\$disconnect(); });
\""

echo "=== 4. Reseeding with UUID IDs ==="
$SSH "docker exec $CONTAINER npx prisma db seed"

echo "=== Done! All master IDs are now UUIDs ==="
$SSH "docker exec $CONTAINER node -e \"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.master.findMany({ select: { id: true, name: true } })
  .then(ms => { ms.forEach(m => console.log(m.id, m.name)); return prisma.\$disconnect(); });
\""
