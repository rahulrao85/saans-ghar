/** HTTP status codes the API returns. */
export const STATUS = {
  badRequest: 400,
  forbidden: 403,
  tooLarge: 413,
  tooMany: 429,
  serverError: 500,
  badGateway: 502,
} as const;
