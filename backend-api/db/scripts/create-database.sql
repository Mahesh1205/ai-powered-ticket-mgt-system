-- Create the ticket_system database if it does not exist
-- This script should be run against the 'postgres' admin database
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'ticket_system') THEN
        PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE ticket_system');
    END IF;
END
$$;

-- Fallback: If dblink is not available, use this simpler approach via psql:
-- SELECT 'CREATE DATABASE ticket_system'
-- WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ticket_system')\gexec
