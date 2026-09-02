const bcrypt = require('bcrypt');
const hash = '$2b$12$khHjurP7dWF8xZcS9QwLbOl9ZTu3C59KOeqRVPKtCC75HIpZFvxIi';
const password = 'admin123';
bcrypt.compare(password, hash).then(res => console.log('Match:', res));
