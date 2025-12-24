-- ========================================
-- COMPLETE DATABASE SETUP FOR PERSONALIZED CHATBOT
-- Azure OpenAI Chatbot with Full Authentication & Features
-- Version: 1.0.0
-- Date: December 24, 2025
-- ========================================

-- ========================================
-- DATABASE CREATION
-- ========================================
CREATE DATABASE IF NOT EXISTS chatbot
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci
COMMENT 'Personalized AI Chatbot Database';

USE chatbot;

SELECT '========================================' as '';
SELECT '🚀 Starting Database Setup...' as Status;
SELECT '========================================' as '';

-- ========================================
-- 1. USERS TABLE (Authentication & Profile)
-- ========================================
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS azure_sessions;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY COMMENT 'UUID for user identification',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email address',
  username VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique username',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password with salt',
  first_name VARCHAR(100) NULL COMMENT 'User first name',
  last_name VARCHAR(100) NULL COMMENT 'User last name',
  created_at BIGINT NOT NULL COMMENT 'Account creation timestamp (milliseconds)',
  updated_at BIGINT NOT NULL COMMENT 'Last update timestamp (milliseconds)',
  last_login_at BIGINT NULL COMMENT 'Last login timestamp (milliseconds)',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Account active status',
  
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_created_at (created_at),
  INDEX idx_last_login (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts with authentication credentials';

SELECT '✓ Users table created' as Progress;

-- ========================================
-- 2. REFRESH TOKENS TABLE (JWT Session Management)
-- ========================================
CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL COMMENT 'Reference to users table',
  token VARCHAR(500) NOT NULL UNIQUE COMMENT 'JWT refresh token',
  expires_at BIGINT NOT NULL COMMENT 'Token expiration timestamp (milliseconds)',
  created_at BIGINT NOT NULL COMMENT 'Token creation timestamp (milliseconds)',
  revoked BOOLEAN DEFAULT FALSE COMMENT 'Token revocation status',
  device_info VARCHAR(500) NULL COMMENT 'Device/browser information (optional)',
  ip_address VARCHAR(45) NULL COMMENT 'IP address of token creation',
  
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_revoked (revoked),
  
  CONSTRAINT fk_refresh_tokens_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='JWT refresh tokens for session management';

SELECT '✓ Refresh tokens table created' as Progress;

-- ========================================
-- 3. PASSWORD RESET TOKENS TABLE
-- ========================================
CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL COMMENT 'Reference to users table',
  token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Password reset token',
  expires_at BIGINT NOT NULL COMMENT 'Token expiry timestamp (milliseconds)',
  used BOOLEAN DEFAULT FALSE COMMENT 'Whether token has been used',
  created_at BIGINT NOT NULL COMMENT 'Token creation timestamp (milliseconds)',
  used_at BIGINT NULL COMMENT 'When token was used (milliseconds)',
  ip_address VARCHAR(45) NULL COMMENT 'IP address of reset request',
  
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_used (used),
  
  CONSTRAINT fk_password_reset_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Password reset tokens for email-based recovery';

SELECT '✓ Password reset tokens table created' as Progress;

-- ========================================
-- 4. CONVERSATIONS TABLE
-- ========================================
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY COMMENT 'UUID for conversation',
  user_id VARCHAR(255) NOT NULL COMMENT 'Owner of the conversation',
  title VARCHAR(500) NOT NULL DEFAULT 'New chat' COMMENT 'Conversation title',
  azure_response_id VARCHAR(255) NULL COMMENT 'Azure Response API session ID',
  created_at BIGINT NOT NULL COMMENT 'Creation timestamp (milliseconds)',
  updated_at BIGINT NOT NULL COMMENT 'Last update timestamp (milliseconds)',
  message_count INT DEFAULT 0 COMMENT 'Total messages in conversation',
  is_archived BOOLEAN DEFAULT FALSE COMMENT 'Archive status',
  
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at),
  INDEX idx_created_at (created_at),
  INDEX idx_azure_response_id (azure_response_id),
  INDEX idx_archived (is_archived),
  INDEX idx_user_updated (user_id, updated_at),
  
  CONSTRAINT fk_conversations_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chat conversations with metadata';

SELECT '✓ Conversations table created' as Progress;

-- ========================================
-- 5. MESSAGES TABLE
-- ========================================
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL COMMENT 'Reference to conversations table',
  role ENUM('user', 'assistant', 'system') NOT NULL COMMENT 'Message sender role',
  content TEXT NOT NULL COMMENT 'Message content (markdown supported)',
  display_content TEXT NULL COMMENT 'Formatted display content (if different)',
  created_at BIGINT NOT NULL COMMENT 'Message timestamp (milliseconds)',
  token_count INT NULL COMMENT 'Token count for this message',
  has_attachments BOOLEAN DEFAULT FALSE COMMENT 'Whether message has attachments',
  
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_created_at (created_at),
  INDEX idx_conversation_created (conversation_id, created_at),
  INDEX idx_role (role),
  
  CONSTRAINT fk_messages_conversation 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chat messages with full history';

SELECT '✓ Messages table created' as Progress;

-- ========================================
-- 6. ATTACHMENTS TABLE (Multimodal Support)
-- ========================================
CREATE TABLE attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL COMMENT 'Reference to messages table',
  type ENUM('image', 'pdf', 'audio', 'document', 'file') NOT NULL COMMENT 'Attachment type',
  mime_type VARCHAR(255) NOT NULL COMMENT 'MIME type (e.g., image/jpeg)',
  file_name VARCHAR(500) NOT NULL COMMENT 'Original filename',
  file_size INT NULL COMMENT 'File size in bytes',
  file_data LONGBLOB NOT NULL COMMENT 'Base64 encoded file data',
  thumbnail BLOB NULL COMMENT 'Thumbnail image (for images/PDFs)',
  created_at BIGINT NOT NULL COMMENT 'Upload timestamp (milliseconds)',
  
  INDEX idx_message_id (message_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT fk_attachments_message 
    FOREIGN KEY (message_id) REFERENCES messages(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='File attachments for messages (images, PDFs, documents)';

SELECT '✓ Attachments table created' as Progress;

-- ========================================
-- 7. AZURE SESSIONS TABLE (Optional - for monitoring)
-- ========================================
CREATE TABLE azure_sessions (
  session_id VARCHAR(255) PRIMARY KEY COMMENT 'Azure OpenAI session ID',
  conversation_id VARCHAR(255) NOT NULL COMMENT 'Reference to conversations table',
  model_name VARCHAR(100) NULL COMMENT 'Azure model used (e.g., GPT-4)',
  total_tokens INT DEFAULT 0 COMMENT 'Cumulative token usage',
  total_messages INT DEFAULT 0 COMMENT 'Message count in session',
  last_used_at BIGINT NOT NULL COMMENT 'Last API call timestamp (milliseconds)',
  expires_at BIGINT NULL COMMENT 'Session expiration (if applicable)',
  created_at BIGINT NOT NULL COMMENT 'Session creation timestamp (milliseconds)',
  status ENUM('active', 'expired', 'closed') DEFAULT 'active' COMMENT 'Session status',
  
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_last_used_at (last_used_at),
  INDEX idx_status (status),
  INDEX idx_expires_at (expires_at),
  
  CONSTRAINT fk_azure_sessions_conversation 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Azure OpenAI session tracking and monitoring';

SELECT '✓ Azure sessions table created' as Progress;

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Update conversation message count and timestamp
DELIMITER //
CREATE TRIGGER update_conversation_on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
  UPDATE conversations 
  SET 
    message_count = message_count + 1,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
END//

CREATE TRIGGER update_conversation_on_message_delete
AFTER DELETE ON messages
FOR EACH ROW
BEGIN
  UPDATE conversations 
  SET message_count = message_count - 1
  WHERE id = OLD.conversation_id;
END//

DELIMITER ;

SELECT '✓ Database triggers created' as Progress;

-- ========================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- ========================================

-- Procedure to clean up expired tokens
DELIMITER //
CREATE PROCEDURE cleanup_expired_tokens()
BEGIN
  -- Delete expired refresh tokens
  DELETE FROM refresh_tokens 
  WHERE expires_at < UNIX_TIMESTAMP() * 1000;
  
  -- Delete expired password reset tokens
  DELETE FROM password_reset_tokens 
  WHERE expires_at < UNIX_TIMESTAMP() * 1000;
  
  SELECT ROW_COUNT() as 'Tokens Cleaned';
END//

-- Procedure to get user statistics
CREATE PROCEDURE get_user_stats(IN user_id_param VARCHAR(255))
BEGIN
  SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(m.id) as total_messages,
    SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END) as user_messages,
    SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) as ai_messages,
    FROM_UNIXTIME(u.created_at / 1000) as joined_date,
    FROM_UNIXTIME(u.last_login_at / 1000) as last_login
  FROM users u
  LEFT JOIN conversations c ON u.id = c.user_id
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE u.id = user_id_param
  GROUP BY u.id;
END//

DELIMITER ;

SELECT '✓ Stored procedures created' as Progress;

-- ========================================
-- DEFAULT DATA (Optional)
-- ========================================

-- You can add a default admin user here if needed
-- Password: 'admin123' (hashed with bcrypt, salt rounds = 10)
-- INSERT INTO users (id, email, username, password_hash, created_at, updated_at, is_active) 
-- VALUES (
--   UUID(),
--   'admin@example.com',
--   'admin',
--   '$2b$10$YourHashedPasswordHere',
--   UNIX_TIMESTAMP() * 1000,
--   UNIX_TIMESTAMP() * 1000,
--   TRUE
-- );

-- ========================================
-- VERIFICATION & SUMMARY
-- ========================================

SELECT '========================================' as '';
SELECT '📊 DATABASE STRUCTURE VERIFICATION' as '';
SELECT '========================================' as '';

-- Show all tables
SELECT 'All Tables:' as Info;
SHOW TABLES;

-- Table row counts
SELECT '========================================' as '';
SELECT 'Table Statistics:' as Info;
SELECT 
  'users' as 'Table Name',
  COUNT(*) as 'Row Count'
FROM users
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL
SELECT 'refresh_tokens', COUNT(*) FROM refresh_tokens
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
UNION ALL
SELECT 'azure_sessions', COUNT(*) FROM azure_sessions;

-- Show foreign key relationships
SELECT '========================================' as '';
SELECT 'Foreign Key Relationships:' as Info;
SELECT 
    CONCAT(TABLE_NAME, '.', COLUMN_NAME) as 'Column',
    CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME) as 'References',
    CONSTRAINT_NAME as 'Constraint'
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'chatbot'
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Show indexes
SELECT '========================================' as '';
SELECT 'Database Indexes:' as Info;
SELECT 
    TABLE_NAME as 'Table',
    INDEX_NAME as 'Index',
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as 'Columns'
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'chatbot'
    AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Final success message
SELECT '========================================' as '';
SELECT '✅ DATABASE SETUP COMPLETE!' as '';
SELECT '========================================' as '';
SELECT '' as '';
SELECT '📊 Summary:' as '';
SELECT '  • Database: chatbot' as '';
SELECT '  • Tables: 7' as '';
SELECT '  • Triggers: 2' as '';
SELECT '  • Procedures: 2' as '';
SELECT '  • Charset: utf8mb4' as '';
SELECT '' as '';
SELECT '🎯 Features Enabled:' as '';
SELECT '  • User Authentication (JWT)' as '';
SELECT '  • Password Reset via Email' as '';
SELECT '  • Conversation Management' as '';
SELECT '  • Message History' as '';
SELECT '  • File Attachments (Multimodal)' as '';
SELECT '  • Azure OpenAI Integration' as '';
SELECT '  • Session Tracking' as '';
SELECT '' as '';
SELECT '🚀 Next Steps:' as '';
SELECT '  1. Configure server/.env file' as '';
SELECT '  2. Start backend: cd server && npm start' as '';
SELECT '  3. Start frontend: npm run dev' as '';
SELECT '  4. Visit: http://localhost:5173' as '';
SELECT '  5. Create account and start chatting!' as '';
SELECT '' as '';
SELECT '========================================' as '';

-- ========================================
-- MAINTENANCE QUERIES (For Reference)
-- ========================================

-- To clean expired tokens manually:
-- CALL cleanup_expired_tokens();

-- To get user statistics:
-- CALL get_user_stats('user-uuid-here');

-- To view recent conversations:
-- SELECT c.id, c.title, u.username, c.message_count, 
--        FROM_UNIXTIME(c.updated_at / 1000) as last_update
-- FROM conversations c
-- JOIN users u ON c.user_id = u.id
-- ORDER BY c.updated_at DESC
-- LIMIT 10;

-- To view message history for a conversation:
-- SELECT m.role, LEFT(m.content, 100) as preview, 
--        FROM_UNIXTIME(m.created_at / 1000) as timestamp
-- FROM messages m
-- WHERE m.conversation_id = 'conversation-id-here'
-- ORDER BY m.created_at;

-- To check token usage:
-- SELECT model_name, SUM(total_tokens) as total_tokens, COUNT(*) as sessions
-- FROM azure_sessions
-- WHERE status = 'active'
-- GROUP BY model_name;
