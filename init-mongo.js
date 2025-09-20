// MongoDB initialization script
// This script creates a non-root user for the application

db = db.getSiblingDB('react_fastapi_app');

// Create application user with read/write permissions
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'react_fastapi_app'
    }
  ]
});

// Create initial collections (optional)
db.createCollection('users');
db.createCollection('news');

print('Database initialized successfully with user: app_user');

