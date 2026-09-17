import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const models = [
  { value: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash (권장)" },
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (강력)" },
  { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite (빠름)" },
  { value: "openai/gpt-5.5", label: "GPT-5.5 (최고)" },
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini (균형)" },
  { value: "openai/gpt-5.4-nano", label: "GPT-5.4 Nano (빠름)" },
];

const ModelSelector = ({ value, onChange }: ModelSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="model-select">AI 모델 선택</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="model-select">
          <SelectValue placeholder="모델을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
