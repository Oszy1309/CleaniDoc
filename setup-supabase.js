/**
 * Setup Supabase Database & Create Test Users
 * Run with: node setup-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Load environment variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
// Use Service Role Key for database operations
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('  - REACT_APP_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ missing');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✓' : '✗ missing');
  console.error('\nPlease set these variables in your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setup() {
  console.log('🔧 Setting up Supabase database...\n');

  try {
    // Create test users for DEVELOPMENT/TESTING ONLY
    // NEVER use these credentials in production!
    // Change passwords immediately after first login
    const testUsers = [
      {
        email: 'admin@cleanidoc.de',
        password: 'password123', // CHANGE THIS IN PRODUCTION!
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
      },
      {
        email: 'worker@cleanidoc.de',
        password: 'password123', // CHANGE THIS IN PRODUCTION!
        role: 'employee',
        first_name: 'Worker',
        last_name: 'User',
      },
      {
        email: 'customer@cleanidoc.de',
        password: 'password123', // CHANGE THIS IN PRODUCTION!
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
