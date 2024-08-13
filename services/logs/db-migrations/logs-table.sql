CREATE TABLE IF NOT EXISTS logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255),

    timestamp DATETIME,
    origin VARCHAR(255),
    application_name VARCHAR(255),

    message VARCHAR(255),
    label VARCHAR(255),
    code INT,
    metadata TEXT
);
