/**
 * Add Single User to Supabase Database
 * Usage: node add-user.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

// Supabase credentials from environment
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function addUser() {
  console.log('🔧 Adding user to Supabase...\n');

  // Prompt for user details
  const email = await prompt('Email: ');
  const password = await prompt('Password (min. 8 characters): ');
  const role = await prompt('Role (admin/manager/employee/customer): ');
  const first_name = await prompt('First Name: ');
  const last_name = await prompt('Last Name: ');

  const user = {
    email: email.trim(),
    password: password,
    role: role.trim().toLowerCase(),
    first_name: first_name.trim(),
    last_name: last_name.trim(),
  };

  // Validate inputs
  if (!user.email || !user.email.includes('@')) {
    console.error('❌ Invalid email address');
    rl.close();
    process.exit(1);
  }

  if (user.password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    rl.close();
    process.exit(1);
  }

  const validRoles = ['admin', 'manager', 'employee', 'customer'];
  if (!validRoles.includes(user.role)) {
    console.error('❌ Invalid role. Must be one of:', validRoles.join(', '));
    rl.close();
    process.exit(1);
  }

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
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log('─'.repeat(50));
      console.log('\n⚠️  Please change your password on first login!\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  } finally {
    rl.close();
  }
}

addUser();
