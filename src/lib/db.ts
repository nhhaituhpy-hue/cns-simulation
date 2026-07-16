import type { Scenario, SiteState, RecordedAction } from "./types";

// Định nghĩa giao diện tối giản cho D1Database để không phụ thuộc vào workers-types
export interface D1DatabaseSimple {
  prepare(query: string): {
    bind(...args: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
      run(): Promise<{ success: boolean }>;
    };
  };
}

// Global variable giả lập trong bộ nhớ RAM để chạy cục bộ (local dev)
// Tránh dùng các thư viện Node.js (fs, path) để không gây lỗi biên dịch ở Edge runtime
type MockRow = Record<string, unknown>;
type MockD1Data = { Scenarios?: Record<string, MockRow> };
type MockD1Global = typeof globalThis & { __mockD1Data?: MockD1Data };

const globalStorage = globalThis as MockD1Global;
if (!globalStorage.__mockD1Data) {
  globalStorage.__mockD1Data = {};
}

class LocalMockD1Database implements D1DatabaseSimple {
  private getStorage(): MockD1Data {
    return globalStorage.__mockD1Data ?? {};
  }

  private saveStorage(data: MockD1Data): void {
    globalStorage.__mockD1Data = data;
    // Nếu ở browser, đồng bộ thêm vào localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("adsb-training-simulator:mock-d1", JSON.stringify(data));
      } catch {
        // Bỏ qua lỗi hạn ngạch lưu trữ
      }
    }
  }

  prepare(query: string) {
    const isInsert = query.trim().toUpperCase().startsWith("INSERT");
    const isDelete = query.trim().toUpperCase().startsWith("DELETE");

    return {
      bind: (...args: unknown[]) => {
        return {
          first: async <T = unknown>(): Promise<T | null> => {
            const data = this.getStorage();
            const scenarios = Object.values(data.Scenarios ?? {});
            if (scenarios.length === 0) return null;
            
            // Tìm theo ID (giả định tham số bind đầu tiên là ID)
            const id = args[0];
            const found = scenarios.find((scenario) => scenario.id === id);
            return (found as T | undefined) ?? null;
          },
          all: async <T = unknown>(): Promise<{ results: T[]; success: boolean }> => {
            const data = this.getStorage();
            const list = Object.values(data.Scenarios ?? {}) as T[];
            return { results: list, success: true };
          },
          run: async (): Promise<{ success: boolean }> => {
            const data = this.getStorage();
            const scenarios = (data.Scenarios ??= {});

            if (isInsert || query.includes("INSERT")) {
              // Gán trường theo thứ tự bind của schema.sql:
              // id, title, description, difficulty, sites_json, target_sensor_id, target_login_user, expected_actions_json, created_at, updated_at
              const [
                id,
                title,
                description,
                difficulty,
                sites_json,
                target_sensor_id,
                target_login_user,
                expected_actions_json,
                created_at,
                updated_at,
              ] = args;

              if (typeof id !== "string") {
                return { success: false };
              }
              scenarios[id] = {
                id,
                title,
                description,
                difficulty,
                sites_json,
                target_sensor_id,
                target_login_user,
                expected_actions_json,
                created_at,
                updated_at,
              };
              this.saveStorage(data);
            } else if (isDelete || query.includes("DELETE")) {
              const id = args[0];
              if (typeof id !== "string") {
                return { success: false };
              }
              if (scenarios[id]) {
                delete scenarios[id];
                this.saveStorage(data);
              }
            }
            return { success: true };
          },
        };
      },
    };
  }
}

// Xuất hàm kết nối database
export function getDb(): D1DatabaseSimple {
  // Cloudflare Pages bindings được đưa vào process.env.DB
  const cloudflareDb = (process.env as Record<string, unknown>).DB;
  if (cloudflareDb) {
    return cloudflareDb as D1DatabaseSimple;
  }
  
  // Trả về mock database chạy trên RAM khi ở local dev
  return new LocalMockD1Database();
}

// Helper để parse dữ liệu SQL D1 sang định dạng Scenario TypeScript
function requiredString(
  row: Record<string, unknown>,
  field: string,
): string {
  const value = row[field];
  if (typeof value !== "string") {
    throw new Error('Database field "' + field + '" must be a string.');
  }
  return value;
}

export function mapRowToScenario(row: unknown): Scenario {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw new Error("Database scenario row must be an object.");
  }

  const record = row as Record<string, unknown>;
  const difficulty = requiredString(record, "difficulty");
  const targetLoginUser = requiredString(record, "target_login_user");

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new Error("Database scenario difficulty is invalid.");
  }
  if (!["sysadmin", "maintenance"].includes(targetLoginUser)) {
    throw new Error("Database scenario login user is invalid.");
  }

  const updatedAt =
    record.updated_at === null || record.updated_at === undefined
      ? undefined
      : requiredString(record, "updated_at");

  return {
    id: requiredString(record, "id"),
    title: requiredString(record, "title"),
    description: requiredString(record, "description"),
    difficulty: difficulty as Scenario["difficulty"],
    targetSensorId: requiredString(record, "target_sensor_id"),
    targetLoginUser: targetLoginUser as Scenario["targetLoginUser"],
    sites: JSON.parse(requiredString(record, "sites_json")) as SiteState[],
    expectedActions: JSON.parse(
      requiredString(record, "expected_actions_json"),
    ) as RecordedAction[],
    createdAt: requiredString(record, "created_at"),
    updatedAt,
  };
}
