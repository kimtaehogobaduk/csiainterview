export const SCHOOLS = [
  { value: 'cheongshim', label: '청심국제고등학교' },
  { value: 'hana', label: '하나고등학교' },
  { value: 'sangsan', label: '상산고등학교' },
  { value: 'minsa', label: '민족사관고등학교' },
  { value: 'daewon', label: '대원외국어고등학교' },
  { value: 'daeil', label: '대일외국어고등학교' },
  { value: 'myungduk', label: '명덕외국어고등학교' },
  { value: 'gyeonggi', label: '경기외국어고등학교' },
  { value: 'busan', label: '부산국제고등학교' },
  { value: 'incheon', label: '인천외국어고등학교' },
  { value: 'other', label: '기타' }
] as const;

export type SchoolValue = typeof SCHOOLS[number]['value'];

export const getSchoolLabel = (value: string): string => {
  const school = SCHOOLS.find(s => s.value === value);
  return school?.label || '청심국제고등학교';
};

export const SCHOOL_INFO: Record<string, {
  name: string;
  keywords: string[];
  characteristics: string;
  interviewFocus: string;
}> = {
  cheongshim: {
    name: '청심국제고등학교',
    keywords: ['ACG 교육', '글로벌 리더', '기숙사', '가평', '건학 이념'],
    characteristics: '청심국제고는 ACG(Academic, Character, Global) 교육 철학을 바탕으로 글로벌 리더를 양성하는 학교입니다. 가평에 위치하며 3년간 기숙사 생활을 합니다.',
    interviewFocus: 'ACG 교육 철학에 대한 이해, 글로벌 리더십, 기숙사 생활 적응력, 봉사정신'
  },
  hana: {
    name: '하나고등학교',
    keywords: ['자기주도학습', '창의융합', '하나정신', '서울', '전인교육'],
    characteristics: '하나고는 자기주도학습 능력과 창의융합 역량을 갖춘 인재 양성을 목표로 합니다. 서울에 위치하며 하나정신(정직, 봉사, 창의)을 강조합니다.',
    interviewFocus: '자기주도학습 능력, 창의적 문제해결력, 하나정신에 대한 이해, 협동심'
  },
  sangsan: {
    name: '상산고등학교',
    keywords: ['과학영재', '수학과학', '전북', '연구역량', 'STEM'],
    characteristics: '상산고는 수학·과학 분야의 영재 교육을 중점으로 하며, 연구 역량 강화를 목표로 합니다. 전북 전주에 위치합니다.',
    interviewFocus: '수학·과학 탐구 능력, 논리적 사고력, 연구에 대한 열정, 학문적 호기심'
  },
  minsa: {
    name: '민족사관고등학교',
    keywords: ['민족정신', '한국학', '강원', '전통문화', '글로벌'],
    characteristics: '민사고는 민족정신과 글로벌 역량을 동시에 갖춘 인재 양성을 목표로 합니다. 강원 횡성에 위치하며 한국학 교육을 강조합니다.',
    interviewFocus: '민족정신과 정체성, 한국 문화에 대한 이해, 글로벌 시각, 리더십'
  },
  daewon: {
    name: '대원외국어고등학교',
    keywords: ['외국어 교육', '국제화', '서울', '어학 역량', '글로벌 인재'],
    characteristics: '대원외고는 뛰어난 외국어 능력과 국제적 감각을 갖춘 인재 양성을 목표로 합니다. 서울에 위치합니다.',
    interviewFocus: '외국어 능력, 국제 감각, 문화적 다양성 이해, 의사소통 능력'
  },
  daeil: {
    name: '대일외국어고등학교',
    keywords: ['외국어', '인성교육', '서울', '글로벌 역량'],
    characteristics: '대일외고는 외국어 능력과 인성을 겸비한 글로벌 인재 양성을 목표로 합니다.',
    interviewFocus: '외국어 학습 경험, 인성, 국제 이해, 자기주도성'
  },
  myungduk: {
    name: '명덕외국어고등학교',
    keywords: ['외국어', '창의인재', '서울', '글로벌 소양'],
    characteristics: '명덕외고는 창의적 사고와 글로벌 소양을 갖춘 인재 양성을 목표로 합니다.',
    interviewFocus: '창의성, 외국어 능력, 글로벌 마인드, 학업 열정'
  },
  gyeonggi: {
    name: '경기외국어고등학교',
    keywords: ['외국어', '경기', '국제화', '다문화 이해'],
    characteristics: '경기외고는 경기 지역을 대표하는 외국어 특성화 고등학교입니다.',
    interviewFocus: '외국어 학습 동기, 국제 이슈 관심, 다문화 이해, 학업 계획'
  },
  busan: {
    name: '부산국제고등학교',
    keywords: ['국제화', '부산', 'IB 과정', '글로벌 리더'],
    characteristics: '부산국제고는 IB 과정을 운영하며 글로벌 인재 양성을 목표로 합니다.',
    interviewFocus: 'IB 교육에 대한 이해, 국제적 감각, 비판적 사고, 학업 열정'
  },
  incheon: {
    name: '인천외국어고등학교',
    keywords: ['외국어', '인천', '국제교류', '어학 역량'],
    characteristics: '인천외고는 인천 지역의 대표적인 외국어 특성화 고등학교입니다.',
    interviewFocus: '외국어 능력, 국제 감각, 자기주도학습, 진로 계획'
  },
  other: {
    name: '자율형 사립고/외국어고',
    keywords: ['자기주도학습', '창의성', '리더십', '학업 역량'],
    characteristics: '자율형 사립고 및 외국어고는 자기주도적 학습 능력과 창의적 인재 양성을 목표로 합니다.',
    interviewFocus: '자기주도학습 능력, 진로 목표, 학업 열정, 인성'
  }
};
