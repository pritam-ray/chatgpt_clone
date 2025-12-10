-- ========================================
-- Authentication Schema Migration
-- Adds user authentication to chatbot database
-- ========================================

USE chatbot;

-- ========================================
-- Users Table
-- Stores user accounts with encrypted passwords
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  updated_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  last_login_at BIGINT NULL COMMENT 'Last login timestamp',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Account active status',
  
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Add user_id to conversations table
-- Links conversations to specific users
-- ========================================
ALTER TABLE conversations 
ADD COLUMN user_id VARCHAR(255) NULL COMMENT 'Owner of the conversation',
ADD CONSTRAINT fk_conversations_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
ADD INDEX idx_user_id (user_id);

-- ========================================
-- Refresh Tokens Table
-- Stores JWT refresh tokens for session management
-- ========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL COMMENT 'Token expiration timestamp',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  revoked BOOLEAN DEFAULT FALSE COMMENT 'Token revoked status',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Sample Queries
-- ========================================

-- View all users
-- SELECT id, email, username, FROM_UNIXTIME(created_at/1000) as created_at 
-- FROM users ORDER BY created_at DESC;

-- View user's conversations
-- SELECT u.email, c.title, COUNT(m.id) as message_count
-- FROM users u
-- JOIN conversations c ON u.id = c.user_id
-- LEFT JOIN messages m ON c.id = m.conversation_id
-- GROUP BY u.id, c.id;

-- Clean up expired refresh tokens
-- DELETE FROM refresh_tokens WHERE expires_at < UNIX_TIMESTAMP() * 1000 OR revoked = TRUE;
