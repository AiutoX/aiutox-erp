export type ModuleState =
  | "not_installed"
  | "installing"
  | "active"
  | "disabled"
  | "grace_period"
  | "exported"
  | "uninstalled";

export interface ModuleInfo {
  module: string;
  version: string;
  tier: "basic" | "pro" | "enterprise";
  state: ModuleState;
  installed_at: string | null;
  grace_deadline: string | null;
}

export interface ModuleAction {
  action: "install" | "disable" | "enable" | "uninstall_request" | "reactivate";
  label: string;
  description: string;
  variant: "default" | "secondary" | "destructive";
}
