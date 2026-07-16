-- Migration 003: Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "createdBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT message_length CHECK (char_length(message) <= 2000)
);

-- Index for fetching comments by ticket
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments("ticketId");
