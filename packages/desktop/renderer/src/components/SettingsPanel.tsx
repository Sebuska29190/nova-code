import { useState } from "react";
import { useSettingsStore, type Provider } from "../stores/settings";
import { useAppStore } from "../stores/app";

export function SettingsPanel() {
  return (
    <div className="flex-1 overflow-y-auto bg-neutral-950 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-neutral-100">Settings</h1>
        <GeneralSection />
        <ProvidersSection />
        <InfoSection />
      </div>
    </div>
  );
}

function GeneralSection() {
  const { theme, locale, workingDirectory, maxTokens, setTheme, setLocale, setWorkingDirectory, setMaxTokens } =
    useSettingsStore();
  const { setTheme: setAppTheme } = useAppStore();

  const handleThemeChange = (t: "dark" | "light" | "system") => {
    setTheme(t);
    setAppTheme(t);
  };

  const handleBrowse = async () => {
    if (window.nova?.dialog?.openDirectory) {
      const dir = await window.nova.dialog.openDirectory();
      if (dir) setWorkingDirectory(dir);
    }
  };

  return (
    <Section title="General">
      <div className="space-y-5">
        <FieldRow label="Theme">
          <div className="flex gap-2">
            {(["dark", "light", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleThemeChange(t)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                  theme === t
                    ? "bg-nova-600 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Language">
          <div className="flex gap-2">
            {(["en", "pl", "zh"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-3 py-1.5 rounded-lg text-sm uppercase transition-colors ${
                  locale === l
                    ? "bg-nova-600 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Working directory">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
              placeholder="/home/user/projects"
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50"
            />
            <button
              onClick={handleBrowse}
              className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-sm hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
            >
              Browse
            </button>
          </div>
        </FieldRow>

        <FieldRow label={`Max tokens: ${maxTokens.toLocaleString()}`}>
          <div className="flex-1">
            <input
              type="range"
              min={1024}
              max={32768}
              step={1024}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-neutral-800 accent-nova-600"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
              <span>1,024</span>
              <span>32,768</span>
            </div>
          </div>
        </FieldRow>
      </div>
    </Section>
  );
}

function ProvidersSection() {
  const { providers, activeProviderId, setActiveProvider, updateProvider } = useSettingsStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSaveKey = async (providerId: string, apiKey: string) => {
    if (!window.nova?.engine?.setApiKey) return;
    setSavingKey(true);
    try {
      await window.nova.engine.setApiKey(providerId, apiKey);
      updateProvider(providerId, { apiKey, enabled: true });
    } catch (err) {
      console.error("Failed to save API key:", err);
    } finally {
      setSavingKey(false);
    }
  };

  const handleSetActive = async (providerId: string, modelId: string) => {
    if (window.nova?.engine?.setProvider) {
      await window.nova.engine.setProvider(providerId, modelId);
    }
    setActiveProvider(providerId);
  };

  return (
    <Section title="Providers">
      <p className="text-xs text-neutral-500 mb-4">
        Configure your LLM providers. Get API keys from the provider&apos;s website.
      </p>
      <div className="space-y-2">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isActive={activeProviderId === provider.id}
            isExpanded={expandedId === provider.id}
            onToggle={() => toggle(provider.id)}
            onSetActive={() => handleSetActive(provider.id, provider.models[0] ?? "")}
            onSaveKey={(key) => handleSaveKey(provider.id, key)}
            savingKey={savingKey}
          />
        ))}
      </div>
    </Section>
  );
}

function ProviderCard({
  provider,
  isActive,
  isExpanded,
  onToggle,
  onSetActive,
  onSaveKey,
  savingKey,
}: {
  provider: Provider;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSetActive: () => void;
  onSaveKey: (key: string) => void;
  savingKey: boolean;
}) {
  const { updateProvider } = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(provider.apiKey ?? "");
  const [localModel, setLocalModel] = useState(provider.activeModel);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isActive ? "border-nova-500/60 bg-neutral-900" : "border-neutral-800 bg-neutral-900/60"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${provider.enabled ? "bg-green-500" : "bg-neutral-600"}`}
          />
          <span className="text-sm font-medium text-neutral-200">{provider.name}</span>
          {isActive && (
            <span className="text-[10px] bg-nova-600/20 text-nova-400 px-1.5 py-0.5 rounded">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 font-mono">{provider.activeModel}</span>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-neutral-800 pt-4">
          <FieldRow label="Enabled">
            <Toggle
              checked={provider.enabled}
              onChange={(enabled) => updateProvider(provider.id, { enabled })}
            />
          </FieldRow>

          <FieldRow label="API Key">
            <div className="flex gap-2 flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                onBlur={() => onSaveKey(localKey)}
                onKeyDown={(e) => { if (e.key === "Enter") onSaveKey(localKey); }}
                placeholder="sk-..."
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50 font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2 rounded-lg bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 transition-colors"
              >
                {showKey ? "Hide" : "Show"}
              </button>
              {savingKey && (
                <span className="text-xs text-nova-400 self-center">Saving...</span>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Base URL">
            <input
              type="text"
              value={provider.baseUrl}
              onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50 font-mono"
            />
          </FieldRow>

          <FieldRow label="Model">
            <select
              value={localModel}
              onChange={(e) => {
                setLocalModel(e.target.value);
                updateProvider(provider.id, { activeModel: e.target.value });
              }}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-nova-500 focus:ring-1 focus:ring-nova-500/50 appearance-none cursor-pointer"
            >
              {provider.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </FieldRow>

          {!isActive && (
            <button
              onClick={onSetActive}
              className="w-full py-2 rounded-lg bg-nova-600 hover:bg-nova-500 text-white text-sm font-medium transition-colors"
            >
              Set as active provider
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InfoSection() {
  return (
    <Section title="About">
      <div className="space-y-3 text-sm text-neutral-400">
        <p>
          <span className="text-neutral-200 font-medium">NovaCode</span> — Desktop AI coding assistant
        </p>
        <p>Version: 0.1.0</p>
        <p>
          Free & open source.{" "}
          <a
            href="https://github.com/nova-code/nova-code"
            target="_blank"
            rel="noopener"
            className="text-nova-400 hover:text-nova-300 underline"
          >
            GitHub
          </a>
        </p>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-200 mb-4 pb-2 border-b border-neutral-800">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-neutral-400 w-36 shrink-0">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? "bg-nova-600" : "bg-neutral-700"
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
