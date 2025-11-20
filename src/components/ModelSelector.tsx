import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const models = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (권장)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (강력)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (빠름)" },
  { value: "openai/gpt-5", label: "GPT-5 (최고)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (균형)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (빠름)" },
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
