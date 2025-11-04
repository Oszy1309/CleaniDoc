/**
 * Setup Supabase Database & Create Test Users
 * Run with: node setup-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
const SUPABASE_URL = 'https://mfzvuzwxkfbsogqdnnry.supabase.co';
// Use Service Role Key for database operations
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menZ1end4a2Zic29ncWRubnJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYwNjU4NSwiZXhwIjoyMDc2MTgyNTg1fQ.U6KkLrSVUqietF6DyF84q9gyoy5xphoSVnO8IRv-xxs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setup() {
  console.log('🔧 Setting up Supabase database...\n');

  try {
    // Create test users
    const testUsers = [
      {
        email: 'admin@cleanidoc.de',
        password: 'password123',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
      },
      {
        email: 'worker@cleanidoc.de',
        password: 'password123',
        role: 'employee',
        first_name: 'Worker',
        last_name: 'User',
      },
      {
        email: 'customer@cleanidoc.de',
        password: 'password123',
        role: 'customer',
        first_name: 'Customer',
        last_name: 'User',
      },
    ];

    console.log('Creating test users...\n');

    for (const user of testUsers) {
      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Insert user
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email: user.email,
            password_hash: hashedPassword,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            two_factor_enabled: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        if (error.message.includes('duplicate')) {
          console.log(`✅ User already exists: ${user.email}`);
        } else {
          console.error(`❌ Error creating user ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ Created user: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Password: ${user.password}\n`);
      }
    }

    console.log('\n✅ Setup completed!\n');
    console.log('Test accounts:');
    console.log('─'.repeat(50));
    testUsers.forEach((user) => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
      console.log('─'.repeat(50));
    });
  } catch (error) {
    console.error('❌ Setup error:', error.message);
    process.exit(1);
  }
}

setup();
