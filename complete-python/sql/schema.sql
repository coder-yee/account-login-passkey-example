-- ============================================================
-- Account Login Passkey Example - 完整数据库结构
-- MySQL 8.0+
--
-- 这是“可重复执行”的测试环境初始化脚本：
-- 1. 如果之前创建过不完整的表，先删除旧表。
-- 2. 再一次性创建当前 Python 后端所需的全部表和字段。
-- 3. 适合本示例本地开发/测试；会删除本示例数据库中的旧数据。
-- ============================================================

CREATE DATABASE IF NOT EXISTS account_login_passkey
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE account_login_passkey;

-- 先删子表，再删父表，确保旧版本表结构不会残留。
DROP TABLE IF EXISTS webauthn_challenges;
DROP TABLE IF EXISTS passkeys;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- WebAuthn 专用 User Handle。
    -- 不直接使用业务自增 ID 作为 WebAuthn user.id。
    webauthn_user_id VARBINARY(64) NOT NULL,

    passkey_enabled TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_webauthn_user_id (webauthn_user_id)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE passkeys (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT UNSIGNED NOT NULL,

    credential_id VARBINARY(1024) NOT NULL,
    public_key BLOB NOT NULL,

    sign_count BIGINT UNSIGNED NOT NULL DEFAULT 0,

    name VARCHAR(100) NOT NULL DEFAULT 'Passkey',

    enabled TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    last_used_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uk_passkeys_credential_id (credential_id),
    KEY idx_passkeys_user_id (user_id),

    CONSTRAINT fk_passkeys_user_id
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT UNSIGNED NOT NULL,

    session_token_hash CHAR(64) NOT NULL,

    expires_at DATETIME NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME NULL,
    password_verified_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uk_sessions_token_hash (session_token_hash),
    KEY idx_sessions_user_id (user_id),
    KEY idx_sessions_expires_at (expires_at),

    CONSTRAINT fk_sessions_user_id
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE webauthn_challenges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    challenge VARBINARY(128) NOT NULL,

    type VARCHAR(32) NOT NULL,

    user_id BIGINT UNSIGNED NULL,
    session_id BIGINT UNSIGNED NULL,

    expires_at DATETIME NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_webauthn_challenges_challenge (challenge),
    KEY idx_webauthn_challenges_expires_at (expires_at),
    KEY idx_webauthn_challenges_user_id (user_id),
    KEY idx_webauthn_challenges_session_id (session_id),

    CONSTRAINT fk_webauthn_challenges_user_id
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_webauthn_challenges_session_id
        FOREIGN KEY (session_id)
        REFERENCES sessions (id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
