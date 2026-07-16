-- Migration 002: Create tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled')),
    "assignedTo" UUID REFERENCES users(id) ON DELETE SET NULL,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets("createdAt" DESC);
CREATE INDEX idx_tickets_assigned_to ON tickets("assignedTo");
CREATE INDEX idx_tickets_created_by ON tickets("createdBy");
