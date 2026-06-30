import type { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: true,
      code: err.code,
      message: err.message,
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: true,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
  })
}
