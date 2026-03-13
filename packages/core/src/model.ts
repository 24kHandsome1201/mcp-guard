export type RuleId = string & { readonly __brand: "RuleId" };

export enum Severity {
  Info = "info",
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical"
}

export enum ExitCode {
  Success = 0,
  WarningThresholdExceeded = 1,
  Failure = 2,
  InvalidInput = 3
}

export type SeverityLevel = Severity;

export interface FindingLocation {
  file?: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface SeverityCount {
  info: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface CheckResult {
  check: string;
  ruleId: RuleId;
  status: "pass" | "fail" | "warn";
  message: string;
  severity: Severity;
  details?: Record<string, unknown>;
  location?: FindingLocation;
}

export interface Report {
  command: string;
  findings: CheckResult[];
  startedAt: string;
  finishedAt: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyRuleConfig {
  enabled: boolean;
  severity?: Severity;
  reason?: string;
  params?: Record<string, unknown>;
}

export interface Policy {
  version: string;
  name: string;
  description?: string;
  rules: Record<RuleId, PolicyRuleConfig>;
  metadata?: {
    strictMode?: boolean;
    defaultSeverity?: Severity;
  };
}

export interface CoreError {
  code: string;
  message: string;
  details?: string;
}

export interface RegistryMetadata {
  endpoint: string;
  version?: string;
  description?: string;
  source?: string;
}

export interface ServerIdentity {
  id: string;
  name?: string;
  endpoint?: string;
}

export type MetadataSourceKind = "server-card" | "registry" | "manifest" | "config" | "unknown";

export interface MetadataSourceRef {
  kind: MetadataSourceKind;
  label: string;
  path?: string;
}

export interface NormalizedMetadataIdentity {
  id?: string;
  name?: string;
  version?: string;
}

export interface NormalizedMetadataAuth {
  issuer?: string;
  audience?: string;
  resource?: string;
}

export interface NormalizedMetadataInstall {
  command?: string;
  args?: string[];
}

export interface NormalizedMetadata {
  source: MetadataSourceRef;
  identity: NormalizedMetadataIdentity;
  description?: string;
  homepage?: string;
  repository?: string;
  endpoints?: string[];
  auth?: NormalizedMetadataAuth;
  install?: NormalizedMetadataInstall;
  raw: Record<string, unknown>;
}

export interface MetadataProviderResult {
  source: MetadataSourceRef;
  raw: Record<string, unknown>;
  normalized: NormalizedMetadata;
  warnings: string[];
}

export type TrustBand = "low" | "guarded" | "moderate" | "strong";

export type TrustSignalStatus = "present" | "missing";

export interface TrustSignal {
  id: string;
  label: string;
  status: TrustSignalStatus;
  weight: number;
  message: string;
}

export interface TrustAssessment {
  band: TrustBand;
  score: number;
  maxScore: number;
  presentSignals: number;
  missingSignals: number;
  signals: TrustSignal[];
}

export type DiffRiskLevel = "low" | "medium" | "high";

export interface DiffRiskSummary {
  overallRisk: DiffRiskLevel;
  changedAreas: string[];
  byRisk: Record<DiffRiskLevel, number>;
}

export interface InstallCommandRisk {
  command: string;
  reason: string;
  severity: Severity;
}

export interface AuthFinding {
  check: string;
  message: string;
  severity: Severity;
  location?: FindingLocation;
}

export interface DiffFinding {
  check: string;
  path: string;
  before?: unknown;
  after?: unknown;
  severity: Severity;
}

export type SeverityBucket = keyof SeverityCount;

export interface ReportSummary {
  totalFindings: number;
  bySeverity: SeverityCount;
}

const severityOrder: Severity[] = [
  Severity.Info,
  Severity.Low,
  Severity.Medium,
  Severity.High,
  Severity.Critical
];

function makeRuleId(value: string): RuleId {
  return value as RuleId;
}

export function createRuleId(value: string): RuleId {
  return makeRuleId(value);
}

export function severityValue(level: Severity): number {
  return severityOrder.indexOf(level);
}

export function hasHigherSeverity(left: Severity, right: Severity): boolean {
  return severityValue(left) > severityValue(right);
}

function zeroSeverity(): SeverityCount {
  return {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
}

export function aggregateBySeverity(results: readonly CheckResult[]): SeverityCount {
  return results.reduce((acc, result) => {
    const key = result.severity;
    if (key in acc) {
      acc[key] += 1;
    }
    return acc;
  }, zeroSeverity());
}

export function summarizeReport(report: Pick<Report, "findings">): ReportSummary {
  const bySeverity = aggregateBySeverity(report.findings);
  return {
    totalFindings: report.findings.length,
    bySeverity
  };
}

export interface ExitPolicy {
  warningThreshold?: number;
}

export function exitCodeForReport(report: Pick<Report, "findings">, policy: ExitPolicy = {}): ExitCode {
  const summary = summarizeReport(report);

  if (summary.bySeverity.critical > 0 || summary.bySeverity.high > 0 || summary.bySeverity.medium > 0) {
    return ExitCode.Failure;
  }

  const warningThreshold = policy.warningThreshold ?? 0;
  if (summary.bySeverity.high + summary.bySeverity.critical > 0) {
    return ExitCode.Failure;
  }

  if (summary.bySeverity.low + summary.bySeverity.info > warningThreshold) {
    return ExitCode.WarningThresholdExceeded;
  }

  return ExitCode.Success;
}
