import { eq } from 'drizzle-orm';
import { db } from '@/src/lib/db';
import { user } from '@/src/lib/db/schema';
import { generateHashedPassword } from '@/src/lib/db/utils';

function parseAdminUsers() {
  const adminUsersEnv = process.env.ADMIN_USERS;

  if (!adminUsersEnv) {
    console.error('❌ ADMIN_USERS environment variable is required');
    console.log('Format: email,firstname,lastname;email2,firstname2,lastname2');
    process.exit(1);
  }

  try {
    return adminUsersEnv.split(';').map((userStr) => {
      const [email, firstName, lastName] = userStr.split(',');

      if (!email || !firstName || !lastName) {
        throw new Error(`Invalid user format: ${userStr}`);
      }

      return {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
    });
  } catch (error) {
    console.error('❌ Error parsing ADMIN_USERS environment variable:', error);
    console.log('Format: email,firstname,lastname;email2,firstname2,lastname2');
    process.exit(1);
  }
}

const adminUsers = parseAdminUsers();

function generateRandomPassword(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

async function createAdminUsers() {
  console.log('Creating admin users...\n');

  for (const adminUser of adminUsers) {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, adminUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`❌ User ${adminUser.email} already exists, skipping...`);
        continue;
      }

      // Generate random password
      const password = generateRandomPassword();
      const encryptedPassword = generateHashedPassword(password);

      // Create user
      await db
        .insert(user)
        .values({
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          encryptedPassword,
          role: 'admin',
        })
        .returning();

      console.log(`✅ Created admin user: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: admin`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error creating user ${adminUser.email}:`, error);
    }
  }

  console.log('Admin user creation completed!');
}

// Run the script
createAdminUsers()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
