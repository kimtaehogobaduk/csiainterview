import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import migrationData from "@/data/migration-data.json";

const DataMigration = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<{
    essays: number;
    interviewSessions: number;
    mileageTransactions: number;
    savedQuestions: number;
    errors: string[];
  } | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-migration-data', {
        body: { 
          data: {
            essays: migrationData.essays,
            interviewSessions: migrationData.interviewSessions,
            mileageTransactions: migrationData.mileageTransactions,
            savedQuestions: migrationData.savedQuestions
          }
        }
      });

      if (error) throw error;

      setResults(data.results);
      toast.success("데이터 마이그레이션 완료!");
    } catch (error) {
      console.error('Migration error:', error);
      toast.error("마이그레이션 중 오류가 발생했습니다.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>데이터 마이그레이션</CardTitle>
            <CardDescription>
              기존 사이트의 데이터를 새 시스템으로 가져옵니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>마이그레이션할 데이터:</p>
              <ul className="list-disc list-inside mt-2">
                <li>사용자: {migrationData.summary.totalUsers}명</li>
                <li>에세이: {migrationData.summary.totalEssays}개</li>
                <li>면접 세션: {migrationData.summary.totalInterviewSessions}개</li>
                <li>마일리지 거래: {migrationData.summary.totalMileageTransactions}개</li>
                <li>저장된 질문: {migrationData.summary.totalSavedQuestions}개</li>
              </ul>
            </div>

            <Button 
              onClick={handleImport} 
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? "마이그레이션 중..." : "데이터 마이그레이션 시작"}
            </Button>

            {results && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">마이그레이션 결과</h3>
                <ul className="text-sm space-y-1">
                  <li>에세이: {results.essays}개 성공</li>
                  <li>면접 세션: {results.interviewSessions}개 성공</li>
                  <li>마일리지 거래: {results.mileageTransactions}개 성공</li>
                  <li>저장된 질문: {results.savedQuestions}개 성공</li>
                </ul>
                {results.errors.length > 0 && (
                  <div className="mt-2 text-destructive">
                    <p>오류 {results.errors.length}개:</p>
                    <ul className="text-xs">
                      {results.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataMigration;
