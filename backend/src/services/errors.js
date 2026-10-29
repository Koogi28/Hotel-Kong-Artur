// Forretningslag: fejltyper, som services kaster. Fejl-middlewaren i app.js oversætter dem til
// HTTP-statuskoder, så controllers ikke selv skal håndtere fejl (plan: Structure Decision).

// Ugyldigt input → 400. `fields` er listen af felter, der er galt med (FR-005).
class ValidationError extends Error {
  constructor(message, fields = []) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

// Ressourcen findes ikke → 404
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Ressourcen findes, men må ikke ændres (fx historisk booking) → 409
class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

module.exports = { ValidationError, NotFoundError, ConflictError };
