-- Migration 003: Create comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    message VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fetching comments by ticket
CREATE INDEX idx_comments_ticket_id ON comments("ticketId");
