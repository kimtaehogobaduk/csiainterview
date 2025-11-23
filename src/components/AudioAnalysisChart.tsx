import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

interface AudioAnalysisChartProps {
  scores: {
    pronunciation: number;
    speed: number;
    fluency: number;
    intonation: number;
    delivery: number;
  };
}

const AudioAnalysisChart = ({ scores }: AudioAnalysisChartProps) => {
  const data = [
    { category: "발음·명확성", value: scores.pronunciation, fullMark: 20 },
    { category: "말하기 속도", value: scores.speed, fullMark: 20 },
    { category: "유창성", value: scores.fluency, fullMark: 20 },
    { category: "억양·강조", value: scores.intonation, fullMark: 20 },
    { category: "전달력", value: scores.delivery, fullMark: 20 },
  ];

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-lg">음성 분석 결과</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis angle={90} domain={[0, 20]} />
            <Radar name="점수" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {data.map((item) => (
            <div key={item.category} className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{item.category}</span>
              <span className="text-lg font-bold text-primary">{item.value}점</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioAnalysisChart;