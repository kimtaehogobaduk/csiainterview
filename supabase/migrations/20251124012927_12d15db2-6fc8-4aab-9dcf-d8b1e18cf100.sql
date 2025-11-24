-- 시즌 초기화: 모든 면접 기록, 마일리지, 리더보드 초기화

-- 1. 면접 세션 전체 삭제
DELETE FROM public.interview_sessions;

-- 2. 자소서 전체 삭제
DELETE FROM public.essays;

-- 3. 마일리지 거래 내역 전체 삭제
DELETE FROM public.mileage_transactions;

-- 4. 월간 리더보드 전체 삭제
DELETE FROM public.monthly_leaderboard;

-- 5. 모든 사용자 마일리지 0으로 초기화
UPDATE public.profiles
SET mileage = 0;

-- 6. (선택사항) 구매한 아이템 전체 삭제 - 새 시즌이므로 아이템도 초기화
DELETE FROM public.user_items;

-- 7. (선택사항) 프로필 커스터마이징 전체 삭제 - 새 시즌이므로 커스터마이징도 초기화
DELETE FROM public.user_customization;