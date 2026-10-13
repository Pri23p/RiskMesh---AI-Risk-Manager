export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export const successResponse = <T>(data: T, meta?: Omit<NonNullable<ApiResponse<T>['meta']>, 'timestamp'>): ApiResponse<T> => {
  return {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };
};

export const errorResponse = (code: string, message: string, details?: unknown): ApiResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
};
