-- POSTGRESQL SCHEMA 


-- USERS
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,                 -- serial = auto incr integer 
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);       
CREATE INDEX idx_users_username ON users(username);

-- BODY METRICS 
CREATE TABLE body_metrics (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg       NUMERIC(6, 2),          -- max number of digits bf/aft inclusive 
    height_cm       NUMERIC(5, 1),
    body_fat_pct    NUMERIC(4,1),
    age             SMALLINT,
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_body_metrics_user ON body_metrics(user_id);

-- WORKOUTS 
CREATE TABLE workouts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(120),
    notes           TEXT,
    performed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workouts_user ON workouts(user_id);

-- EXERCISE LOGS 
CREATE TABLE exercise_logs (
    id              SERIAL PRIMARY KEY,
    workout_id      INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise        VARCHAR(100) NOT NULL         
