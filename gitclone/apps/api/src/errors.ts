export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code: string = "bad_request"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = "validation_error") {
    super(message, 400, code);
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", code: string = "forbidden") {
    super(message, 403, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not found", code: string = "not_found") {
    super(message, 404, code);
    this.name = "NotFoundError";
  }
}
