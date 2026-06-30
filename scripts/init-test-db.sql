-- Runs once on first container init. Creates the test database so the
-- pytest suite has a separate target from the development database.
CREATE DATABASE surfwind_test;
