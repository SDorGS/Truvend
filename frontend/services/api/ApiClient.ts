import { supabase } from "@/lib/supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not defined."
  );
}

interface ApiErrorShape {
  error: true;
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }

    return ApiClient.instance;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const authHeader = await this.getAuthHeader();

    // For FormData bodies, the browser must set Content-Type itself so it
    // can include the multipart boundary — a manual "application/json"
    // header here would break the upload silently.
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...authHeader,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      throw new ApiError(401, "UNAUTHORIZED", "Session expired. Please log in again.");
    }

    if (!response.ok) {
      const body: Partial<ApiErrorShape> | null = await response
        .json()
        .catch(() => null);

      throw new ApiError(
        response.status,
        body?.code || "UNKNOWN_ERROR",
        body?.message || "Something went wrong."
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(path, {
      method: "POST",
      body: isFormData ? (body as FormData) : JSON.stringify(body),
    });
  }

  put<T>(path: string, body: unknown) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(path, {
      method: "PUT",
      body: isFormData ? (body as FormData) : JSON.stringify(body),
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, {
      method: "DELETE",
    });
  }
}

export default ApiClient;
