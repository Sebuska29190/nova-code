export interface ToolCallRecord {
  id: string;
  name: string;
  input: string;
  result?: string;
  status: "running" | "completed" | "error";
  startTime: number;
  endTime?: number;
}
