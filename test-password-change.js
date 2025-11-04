/**
 * Test Password Change Endpoint
 * Diagnose why password change is failing
 */

async function testPasswordChange() {
  const API_BASE = 'http://localhost:5000';
  const email = 'oskar.bongard@proton.me';
  const currentPassword = 'password123';
  const newPassword = 'newpassword123'; // Different from current

  console.log('🧪 Testing Password Change Endpoint\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🔐 Current Password: ${currentPassword}`);
  console.log(`🔑 New Password: ${newPassword}\n`);

  try {
    console.log('📤 Sending password change request...\n');
    const response = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword,
      }),
    });

    const data = await response.json();

    console.log(`Status: ${response.status}\n`);
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ Password change successful!\n');

      // Now try to login with new password
      console.log('🔄 Testing login with new password...\n');
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: newPassword,
          role: 'admin',
        }),
      });

      const loginData = await loginResponse.json();
      if (loginResponse.ok && loginData.success) {
        console.log('✅ Login with new password successful!');
        console.log(`Token: ${loginData.token.slice(0, 30)}...\n`);
      } else {
        console.log('❌ Login with new password failed');
        console.log(loginData);
      }
    } else {
      console.log('\n❌ Password change failed\n');
      console.log('Possible issues:');
      console.log('1. Email not found in database');
      console.log('2. Current password is incorrect');
      console.log('3. New password does not meet requirements (8+ chars)');
      console.log('4. New password is same as current password');
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

// Wait a bit for server to start
setTimeout(testPasswordChange, 2000);
