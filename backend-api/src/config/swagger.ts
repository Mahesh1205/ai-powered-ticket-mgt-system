import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Support Ticket Management API",
      version: "1.0.0",
      description:
        "Internal support ticket management REST API with role-based access control, ticket lifecycle state machine, and user management.",
    },
    servers: [{ url: "/api", description: "API server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          required: ["error", "code"],
          properties: {
            error: {
              type: "string",
              description: "Human-readable error message",
            },
            code: {
              type: "string",
              description: "Machine-readable error code",
            },
            details: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Field-level validation details",
            },
          },
        },
        UserDTO: {
          type: "object",
          required: ["id", "name", "email", "role"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "User unique identifier",
            },
            name: {
              type: "string",
              description: "User display name",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            role: {
              type: "string",
              enum: ["agent", "admin"],
              description: "User role",
            },
          },
        },
        TicketDTO: {
          type: "object",
          required: [
            "id",
            "title",
            "description",
            "priority",
            "status",
            "createdBy",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Ticket unique identifier",
            },
            title: {
              type: "string",
              maxLength: 200,
              description: "Ticket title",
            },
            description: {
              type: "string",
              maxLength: 5000,
              description: "Ticket description",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Ticket priority level",
            },
            status: {
              type: "string",
              enum: [
                "Open",
                "In Progress",
                "Resolved",
                "Closed",
                "Cancelled",
              ],
              description: "Current ticket status",
            },
            assignedTo: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "UUID of assigned user or null",
            },
            createdBy: {
              type: "string",
              format: "uuid",
              description: "UUID of the user who created the ticket",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "ISO 8601 creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "ISO 8601 last update timestamp",
            },
          },
        },
        TicketDetailDTO: {
          allOf: [
            { $ref: "#/components/schemas/TicketDTO" },
            {
              type: "object",
              required: ["comments"],
              properties: {
                comments: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CommentDTO" },
                  description:
                    "Comments on the ticket ordered by createdAt ascending",
                },
              },
            },
          ],
        },
        CommentDTO: {
          type: "object",
          required: ["id", "ticketId", "createdBy", "message", "createdAt"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Comment unique identifier",
            },
            ticketId: {
              type: "string",
              format: "uuid",
              description: "UUID of the parent ticket",
            },
            createdBy: {
              type: "string",
              format: "uuid",
              description: "UUID of the user who created the comment",
            },
            message: {
              type: "string",
              maxLength: 2000,
              description: "Comment message text",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "ISO 8601 creation timestamp",
            },
          },
        },
        CreateTicketRequest: {
          type: "object",
          required: ["title", "description", "priority"],
          properties: {
            title: {
              type: "string",
              maxLength: 200,
              description: "Ticket title (max 200 characters)",
            },
            description: {
              type: "string",
              maxLength: 5000,
              description: "Ticket description (max 5000 characters)",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Ticket priority level",
            },
          },
        },
        UpdateTicketRequest: {
          type: "object",
          properties: {
            title: {
              type: "string",
              maxLength: 200,
              description: "Updated ticket title (max 200 characters)",
            },
            description: {
              type: "string",
              maxLength: 5000,
              description: "Updated ticket description (max 5000 characters)",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Updated priority level",
            },
            assignedTo: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "User UUID to assign or null to unassign",
            },
          },
        },
        TransitionStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: [
                "Open",
                "In Progress",
                "Resolved",
                "Closed",
                "Cancelled",
              ],
              description: "Target ticket status for the transition",
            },
          },
        },
        CreateCommentRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              maxLength: 2000,
              description: "Comment message (max 2000 characters)",
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: {
              type: "string",
              maxLength: 100,
              description: "User display name (max 100 characters)",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User password (min 6 characters)",
            },
            role: {
              type: "string",
              enum: ["agent", "admin"],
              description: "User role",
            },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              maxLength: 200,
              description: "Updated display name (max 200 characters)",
            },
            email: {
              type: "string",
              format: "email",
              description: "Updated email address",
            },
            role: {
              type: "string",
              enum: ["agent", "admin"],
              description: "Updated user role",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "New password (min 6 characters, optional)",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              description: "User password",
            },
          },
        },
        LoginResponse: {
          type: "object",
          required: ["token", "user"],
          properties: {
            token: {
              type: "string",
              description: "JWT authentication token",
            },
            user: {
              $ref: "#/components/schemas/UserDTO",
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
