#!/usr/bin/env node

/**
 * Authentication Test Script
 * 
 * This script tests the authentication system end-to-end:
 * 1. Signup a test user
 * 2. Login with credentials
 * 3. Access protected endpoints
 * 4. Refresh token
 * 5. Logout
 */

const API_BASE = 'http://localhost:4000/api';

// Test user credentials
const testUser = {
  email: `test${Date.now()}@example.com`,
  username: `testuser${Date.now()}`,
  password: 'TestPassword123!'
};

let accessToken = '';
let refreshToken = '';
let userId = '';

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  return { response, data };
}

// Test 1: Signup
async function testSignup() {
  console.log('\n🧪 Test 1: Signup');
  console.log(`Testing signup with email: ${testUser.email}`);

  const { response, data } = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(testUser),
  });

  if (response.ok) {
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    userId = data.user.id;
    console.log('✅ Signup successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Username: ${data.user.username}`);
    console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
    return true;
  } else {
    console.error('❌ Signup failed:', data.message || data.error);
    return false;
  }
}

// Test 2: Login
async function testLogin() {
  console.log('\n🧪 Test 2: Login');
  console.log(`Testing login with email: ${testUser.email}`);

  const { response, data } = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
  });

  if (response.ok) {
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    console.log('✅ Login successful');
    console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
    return true;
  } else {
    console.error('❌ Login failed:', data.message || data.error);
    return false;
  }
}

// Test 3: Get User Profile
async function testGetProfile() {
  console.log('\n🧪 Test 3: Get User Profile');

  const { response, data } = await apiRequest('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    console.log('✅ Get profile successful');
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Username: ${data.user.username}`);
    console.log(`   Created: ${new Date(data.user.created_at).toLocaleString()}`);
    return true;
  } else {
    console.error('❌ Get profile failed:', data.message || data.error);
    return false;
  }
}

// Test 4: Create Conversation (Protected Endpoint)
async function testCreateConversation() {
  console.log('\n🧪 Test 4: Create Conversation (Protected Endpoint)');

  const conversationId = `conv_${Date.now()}`;
  const { response, data } = await apiRequest('/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      id: conversationId,
      title: 'Test Conversation',
    }),
  });

  if (response.ok) {
    console.log('✅ Create conversation successful');
    console.log(`   Conversation ID: ${data.id}`);
    console.log(`   Title: ${data.title}`);
    return true;
  } else {
    console.error('❌ Create conversation failed:', data.message || data.error);
    return false;
  }
}

// Test 5: Refresh Token
async function testRefreshToken() {
  console.log('\n🧪 Test 5: Refresh Token');

  const { response, data } = await apiRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshToken,
    }),
  });

  if (response.ok) {
    accessToken = data.accessToken;
    if (data.refreshToken) {
      refreshToken = data.refreshToken;
    }
    console.log('✅ Token refresh successful');
    console.log(`   New Access Token: ${accessToken.substring(0, 20)}...`);
    return true;
  } else {
    console.error('❌ Token refresh failed:', data.message || data.error);
    return false;
  }
}

// Test 6: Update Profile
async function testUpdateProfile() {
  console.log('\n🧪 Test 6: Update Profile');

  const newUsername = `${testUser.username}_updated`;
  const { response, data } = await apiRequest('/auth/me', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      username: newUsername,
    }),
  });

  if (response.ok) {
    console.log('✅ Update profile successful');
    console.log(`   New Username: ${data.user.username}`);
    return true;
  } else {
    console.error('❌ Update profile failed:', data.message || data.error);
    return false;
  }
}

// Test 7: Logout
async function testLogout() {
  console.log('\n🧪 Test 7: Logout');

  const { response, data } = await apiRequest('/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      refreshToken: refreshToken,
    }),
  });

  if (response.ok) {
    console.log('✅ Logout successful');
    return true;
  } else {
    console.error('❌ Logout failed:', data.message || data.error);
    return false;
  }
}

// Test 8: Verify Token Revocation
async function testTokenRevocation() {
  console.log('\n🧪 Test 8: Verify Token Revocation');
  console.log('Attempting to use revoked refresh token...');

  const { response, data } = await apiRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshToken,
    }),
  });

  if (!response.ok) {
    console.log('✅ Token revocation verified (refresh failed as expected)');
    return true;
  } else {
    console.error('❌ Token revocation failed (token still works)');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('========================================');
  console.log('🚀 Authentication System Test Suite');
  console.log('========================================');
  console.log(`Base URL: ${API_BASE}`);

  const results = [];

  try {
    results.push(await testSignup());
    if (results[results.length - 1]) {
      results.push(await testLogin());
      results.push(await testGetProfile());
      results.push(await testCreateConversation());
      results.push(await testRefreshToken());
      results.push(await testUpdateProfile());
      results.push(await testLogout());
      results.push(await testTokenRevocation());
    }
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error('Make sure the server is running on http://localhost:4000');
    process.exit(1);
  }

  // Summary
  console.log('\n========================================');
  console.log('📊 Test Results Summary');
  console.log('========================================');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(0);

  console.log(`Tests Passed: ${passed}/${total} (${percentage}%)`);
  
  if (passed === total) {
    console.log('✅ All tests passed! Authentication system is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/conversations`);
    return true;
  } catch (error) {
    console.error('\n❌ Cannot connect to server at http://localhost:4000');
    console.error('   Please make sure the server is running:');
    console.error('   cd server && npm start');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await runAllTests();
})();
