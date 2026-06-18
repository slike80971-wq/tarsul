import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 12)

  // Create admin user (upsert to avoid duplicates)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trasul.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@trasul.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      about: 'Platform Administrator',
    },
  })

  console.log('✅ Admin user created:', admin.email)

  // Create test users if they don't exist
  const testPassword = await bcrypt.hash('Test@123', 12)

  const ahmed = await prisma.user.upsert({
    where: { email: 'ahmed@test.com' },
    update: {},
    create: {
      name: 'Ahmed',
      email: 'ahmed@test.com',
      password: testPassword,
      role: 'USER',
      isActive: true,
      isVerified: true,
    },
  })

  const sara = await prisma.user.upsert({
    where: { email: 'sara@test.com' },
    update: {},
    create: {
      name: 'Sara',
      email: 'sara@test.com',
      password: testPassword,
      role: 'USER',
      isActive: true,
      isVerified: true,
    },
  })

  console.log('✅ Test users created:', ahmed.email, sara.email)
  console.log('\n📋 Credentials:')
  console.log('  Admin: admin@trasul.com / Admin@123')
  console.log('  Ahmed: ahmed@test.com / Test@123')
  console.log('  Sara:  sara@test.com / Test@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
