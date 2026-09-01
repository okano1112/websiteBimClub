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
    console.log("1. Logging in as admin...");
    const loginRes = await request('POST', '/api/auth/login', { email: 'admin@bimclub.com', password: 'admin123' });
    const setCookie = loginRes.headers['set-cookie'][0];
    const cookie = setCookie.split(';')[0];
    console.log("Login OK:", loginRes.data.success);

    console.log("\n2. Getting courses...");
    const coursesRes = await request('GET', '/api/courses/manage', null, cookie);
    let courseId;
    if (coursesRes.data.courses && coursesRes.data.courses.length > 0) {
      courseId = coursesRes.data.courses[0].id;
      console.log("Using existing course ID:", courseId);
    } else {
      console.log("Creating new course for test...");
      const createRes = await request('POST', '/api/courses', { title: 'Test Course for Comments' }, cookie);
      courseId = createRes.data.course.id;
      // Publish it
      await request('PUT', `/api/courses/${courseId}`, {
        title: 'Test Course for Comments',
        isPublished: true,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }, cookie);
      console.log("Created course ID:", courseId);
    }

    console.log(`\n3. Testing POST comment on course ${courseId}...`);
    const commentRes = await request('POST', `/api/courses/${courseId}/comments`, { content: 'This is an awesome course! 🚀' }, cookie);
    console.log("POST comment response:", commentRes.data);
    const commentId = commentRes.data.comment?.id;

    console.log(`\n4. Testing GET course ${courseId} to verify comment...`);
    const courseGetRes = await request('GET', `/api/courses/${courseId}`, null, cookie);
    console.log("Comments count in GET:", courseGetRes.data.course?.comments?.length);
    console.log("Included comment:", courseGetRes.data.course?.comments?.find(c => c.id === commentId)?.content);

    console.log(`\n5. Testing POST like on course ${courseId}...`);
    const likeRes = await request('POST', `/api/courses/${courseId}/likes`, null, cookie);
    console.log("POST like response:", likeRes.data);

    console.log(`\n6. Testing DELETE comment ${commentId}...`);
    const delCommentRes = await request('DELETE', `/api/courses/${courseId}/comments/${commentId}`, null, cookie);
    console.log("DELETE comment response:", delCommentRes.data);

    console.log(`\n7. Testing DELETE like on course ${courseId}...`);
    const delLikeRes = await request('DELETE', `/api/courses/${courseId}/likes`, null, cookie);
    console.log("DELETE like response:", delLikeRes.data);

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTests();
