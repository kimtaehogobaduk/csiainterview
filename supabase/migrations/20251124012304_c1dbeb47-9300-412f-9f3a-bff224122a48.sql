-- Add more profile items to shop
INSERT INTO public.profile_items (name, description, item_type, price, config, is_available) VALUES
-- Avatar Frames
('다이아몬드 프레임', '눈부신 다이아몬드 프레임', 'avatar_frame', 5000, '{"color": "#B9F2FF"}', true),
('에메랄드 프레임', '고급스러운 에메랄드 프레임', 'avatar_frame', 4500, '{"color": "#50C878"}', true),
('루비 프레임', '화려한 루비 프레임', 'avatar_frame', 4000, '{"color": "#E0115F"}', true),
('사파이어 프레임', '신비로운 사파이어 프레임', 'avatar_frame', 4000, '{"color": "#0F52BA"}', true),
('로즈골드 프레임', '우아한 로즈골드 프레임', 'avatar_frame', 3500, '{"color": "#B76E79"}', true),

-- Badges
('전설의 트로피', '최고의 성취를 나타내는 전설의 트로피', 'badge', 8000, '{"icon": "trophy", "color": "#FFD700"}', true),
('플래티넘 왕관', '최상위 랭커의 상징', 'badge', 7000, '{"icon": "crown", "color": "#E5E4E2"}', true),
('다이아몬드 메달', '빛나는 다이아몬드 메달', 'badge', 6000, '{"icon": "award", "color": "#B9F2FF"}', true),
('골드 메달', '금빛 찬란한 메달', 'badge', 5000, '{"icon": "award", "color": "#FFD700"}', true),
('실버 메달', '은빛 빛나는 메달', 'badge', 4000, '{"icon": "award", "color": "#C0C0C0"}', true),
('브론즈 메달', '든든한 브론즈 메달', 'badge', 3000, '{"icon": "award", "color": "#CD7F32"}', true),

-- Theme Colors
('오션 블루 테마', '시원한 바다 색상 테마', 'theme_color', 3000, '{"color": "#006994"}', true),
('포레스트 그린 테마', '자연스러운 숲 색상 테마', 'theme_color', 3000, '{"color": "#228B22"}', true),
('선셋 오렌지 테마', '따뜻한 석양 색상 테마', 'theme_color', 3000, '{"color": "#FF6347"}', true),
('로얄 퍼플 테마', '고귀한 보라 색상 테마', 'theme_color', 3500, '{"color": "#7851A9"}', true),
('크림슨 레드 테마', '열정적인 빨강 색상 테마', 'theme_color', 3500, '{"color": "#DC143C"}', true),
('미드나잇 블랙 테마', '고급스러운 검정 색상 테마', 'theme_color', 4000, '{"color": "#2C3E50"}', true),

-- Icons
('불꽃 아이콘', '열정을 나타내는 불꽃', 'icon', 2000, '{"iconName": "🔥"}', true),
('별 아이콘', '빛나는 별', 'icon', 2000, '{"iconName": "⭐"}', true),
('왕관 아이콘', '리더를 상징하는 왕관', 'icon', 2500, '{"iconName": "👑"}', true),
('트로피 아이콘', '승리의 트로피', 'icon', 2500, '{"iconName": "🏆"}', true),
('로켓 아이콘', '빠른 성장을 나타내는 로켓', 'icon', 2000, '{"iconName": "🚀"}', true),
('다이아몬드 아이콘', '가장 소중한 다이아몬드', 'icon', 3000, '{"iconName": "💎"}', true),
('무지개 아이콘', '희망의 무지개', 'icon', 2500, '{"iconName": "🌈"}', true),
('책 아이콘', '지식의 상징', 'icon', 2000, '{"iconName": "📚"}', true),
('번개 아이콘', '빠른 실행력', 'icon', 2500, '{"iconName": "⚡"}', true),
('하트 아이콘', '열정과 사랑', 'icon', 2000, '{"iconName": "❤️"}', true)
ON CONFLICT DO NOTHING;