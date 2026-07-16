-- Migration 002: Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled')),
    "assignedTo" UUID REFERENCES users(id) ON DELETE SET NULL,
    "createdBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT title_length CHECK (char_length(title) <= 200),
    CONSTRAINT description_length CHECK (char_length(description) <= 5000)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets("assignedTo");
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets("createdBy");
