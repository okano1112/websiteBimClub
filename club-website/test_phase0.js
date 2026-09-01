const http = require('http');

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
    console.log("1. Testing Register with invalid SMTP (expected fail gracefully without leaving user in DB)...");
    const testUsername = 'testuser_' + Date.now();
    const testEmail = testUsername + '@example.com';
    
    const regRes = await request('POST', '/api/auth/register', { 
        username: testUsername, 
        email: testEmail, 
        password: 'password123',
        fullName: 'Test User'
    });
    console.log("Register response:", regRes.data);
    
    // Check if user was inserted (it should not be if email fails)
    // Actually, SMTP might not be configured, so it might fail. Or if it's configured, it might succeed.
    // Assuming SMTP fails because it's default:
    if (!regRes.data.success) {
      console.log("Expected failure happened. Now testing if email exists...");
      const regRes2 = await request('POST', '/api/auth/register', { 
          username: testUsername, 
          email: testEmail, 
          password: 'password123',
          fullName: 'Test User'
      });
      console.log("Register 2 response:", regRes2.data); // should NOT say "ชื่อผู้ใช้งานหรืออีเมลนี้มีในระบบแล้ว" if transaction rolled back
    }

    console.log("\n2. Testing Forgot Password flow when logged in...");
    const loginRes = await request('POST', '/api/auth/login', { email: 'admin@bimclub.com', password: 'admin123' });
    const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
    
    console.log("Login as admin:", loginRes.data.success);
    
    // Try to reset someone else's password
    const resetFail = await request('POST', '/api/auth/forgot-password', { email: testEmail }, cookie);
    console.log("Reset other's email response:", resetFail.data); // Should fail with 403
    
    // Try to reset own password
    const resetSuccess = await request('POST', '/api/auth/forgot-password', { email: 'admin@bimclub.com' }, cookie);
    console.log("Reset own email response:", resetSuccess.data); // Should succeed

    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTests();
