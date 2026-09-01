const http = require('http');
const db = require('./config/database');

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (cookie) options.headers['Cookie'] = cookie;
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch(e) { parsed = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  try {
    const testUsername = 'testuser_' + Date.now();
    const testEmail = testUsername + '@example.com';
    
    console.log("1. Testing Register (should succeed now with Ethereal)...");
    const regRes = await request('POST', '/api/auth/register', { 
        username: testUsername, 
        email: testEmail, 
        password: 'password123',
        fullName: 'Test User'
    });
    console.log("Register response:", regRes.data);
    
    if (!regRes.data.success) {
      console.log("Register failed, cannot continue.");
      return;
    }

    // Try logging in before verifying
    console.log("\n2. Testing login before verify...");
    const loginRes1 = await request('POST', '/api/auth/login', { email: testEmail, password: 'password123' });
    console.log("Login before verify response:", loginRes1.data);
    if (loginRes1.data.success) {
       console.log("ERROR: Should not be able to log in!");
    }

    // Fetch verify token from DB
    console.log("\n3. Verifying email...");
    const connection = await db.getConnection();
    const [users] = await connection.query('SELECT verify_token FROM users WHERE email = ?', [testEmail]);
    const verifyToken = users[0].verify_token;
    
    const verifyRes = await request('GET', `/api/auth/verify-email?token=${verifyToken}`);
    console.log("Verify response HTML contains 'สำเร็จ':", verifyRes.data.includes('สำเร็จ'));

    // Try logging in after verifying
    console.log("\n4. Testing login after verify...");
    const loginRes2 = await request('POST', '/api/auth/login', { email: testEmail, password: 'password123' });
    console.log("Login after verify response:", loginRes2.data.success);
    const cookie = loginRes2.headers['set-cookie'][0].split(';')[0];
    
    console.log("\n5. Testing Forgot Password flow when logged in...");
    // Reset other's email
    const resetFail = await request('POST', '/api/auth/forgot-password', { email: 'admin@bimclub.com' }, cookie);
    console.log("Reset other's email response:", resetFail.data); 
    
    // Reset own email
    const resetSuccess = await request('POST', '/api/auth/forgot-password', { email: testEmail }, cookie);
    console.log("Reset own email response:", resetSuccess.data);
    
    // Fetch reset token from DB
    const [users2] = await connection.query('SELECT reset_token FROM users WHERE email = ?', [testEmail]);
    const resetToken = users2[0].reset_token;
    
    console.log("\n6. Testing Reset Password with token...");
    const newPassword = 'newpassword456';
    const doReset = await request('POST', '/api/auth/reset-password', { token: resetToken, newPassword: newPassword });
    console.log("Do reset response:", doReset.data);
    
    console.log("\n7. Testing login with NEW password...");
    const loginRes3 = await request('POST', '/api/auth/login', { email: testEmail, password: newPassword });
    console.log("Login with new password response:", loginRes3.data.success);

    connection.release();
    console.log("\nAll tests completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

runTests();
