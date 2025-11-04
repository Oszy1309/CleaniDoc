/**
 * Add Single User to Supabase Database
 * Usage: node add-user.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase credentials
const SUPABASE_URL = 'https://mfzvuzwxkfbsogqdnnry.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menZ1end4a2Zic29ncWRubnJ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYwNjU4NSwiZXhwIjoyMDc2MTgyNTg1fQ.U6KkLrSVUqietF6DyF84q9gyoy5xphoSVnO8IRv-xxs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addUser() {
  console.log('🔧 Adding user to Supabase...\n');

  const user = {
    email: 'oskar.bongard@proton.me',
    password: 'password123', // Change on first login
    role: 'admin',
    first_name: 'Oskar',
    last_name: 'Bongard',
  };

  try {
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
        console.error(`❌ Error creating user:`, error.message);
        process.exit(1);
      }
    } else {
      console.log(`✅ User created successfully!\n`);
      console.log('─'.repeat(50));
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log('─'.repeat(50));
      console.log('\n⚠️  Please change your password on first login!\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addUser();
